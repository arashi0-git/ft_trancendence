import { FastifyInstance } from "fastify";
import { authenticateToken } from "../middleware/auth";
import { UserService } from "../services/userService";
import { UpdateUserSettingsRequest } from "../types/user";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";
import crypto from "crypto";
import "@fastify/multipart";

const AVATAR_UPLOAD_DIR = path.join(process.cwd(), "uploads", "avatars");
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const EXTENSION_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function userRoutes(fastify: FastifyInstance) {
  fastify.patch<{ Body: UpdateUserSettingsRequest }>(
    "/me",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({ error: "User not authenticated" });
        }

        const result = await UserService.updateUserSettings(
          request.user.id,
          request.body || {},
        );

        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update user settings";
        const statusCode =
          error instanceof Error &&
          (message.includes("not authenticated") ||
            message.includes("not found") ||
            message.includes("incorrect") ||
            message.includes("required") ||
            message.includes("already"))
            ? 400
            : 500;

        return reply.status(statusCode).send({ error: message });
      }
    },
  );

  fastify.post(
    "/me/avatar",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({ error: "User not authenticated" });
        }

        const file = await request.file();

        if (!file) {
          return reply.status(400).send({ error: "Avatar file is required" });
        }

        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          file.file.resume();
          return reply
            .status(400)
            .send({ error: "Only PNG, JPEG, or WebP images are allowed" });
        }

        const user = await UserService.getUserById(request.user.id);
        if (!user) {
          file.file.resume();
          return reply.status(404).send({ error: "User not found" });
        }

        await fs.promises.mkdir(AVATAR_UPLOAD_DIR, { recursive: true });

        const extension = EXTENSION_MAP[file.mimetype] ?? "png";
        const uniqueSuffix = crypto.randomBytes(6).toString("hex");
        const fileName = `user-${request.user.id}-${Date.now()}-${uniqueSuffix}.${extension}`;
        const filePath = path.join(AVATAR_UPLOAD_DIR, fileName);

        try {
          await pipeline(file.file, fs.createWriteStream(filePath));
        } catch (error) {
          fastify.log.error(error);
          return reply.status(500).send({ error: "Failed to save avatar" });
        }

        if (
          user.profile_image_url &&
          user.profile_image_url.startsWith("/uploads/avatars/")
        ) {
          const previousPath = path.join(
            process.cwd(),
            user.profile_image_url.replace(/^\/+/, ""),
          );

          fs.promises.unlink(previousPath).catch((unlinkError) => {
            if (unlinkError && unlinkError.code !== "ENOENT") {
              fastify.log.warn(
                `Failed to delete previous avatar for user ${user.id}: ${String(unlinkError)}`,
              );
            }
          });
        }

        const relativeUrl = `/uploads/avatars/${fileName}`;
        let result;
        try {
          result = await UserService.updateUserSettings(request.user.id, {
            profileImageUrl: relativeUrl,
          });
        } catch (updateError) {
          fs.promises.unlink(filePath).catch(() => {});
          throw updateError;
        }

        return reply.send(result);
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code: string }).code === "FST_REQ_FILE_TOO_LARGE"
        ) {
          return reply
            .status(413)
            .send({ error: "Avatar file exceeds the 2MB size limit" });
        }

        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to upload avatar" });
      }
    },
  );
}
