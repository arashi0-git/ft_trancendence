import { FastifyInstance } from "fastify";
import { authenticateToken } from "../middleware/auth";
import { UserService } from "../services/userService";
import { UpdateUserSettingsRequest } from "../types/user";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import "@fastify/multipart";
import sharp from "sharp";

const AVATAR_UPLOAD_DIR = path.join(process.cwd(), "uploads", "avatars");
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);
const OUTPUT_FORMAT: "png" | "webp" = "webp";

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
        let statusCode = 500;

        if (error instanceof Error) {
          if (message.includes("not authenticated")) {
            statusCode = 401;
          } else if (message.includes("not found")) {
            statusCode = 404;
          } else if (
            message.includes("incorrect") ||
            message.includes("required") ||
            message.includes("already")
          ) {
            statusCode = 400;
          }
        }

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

        const file = await request.file({ limits: { files: 1 } });

        if (!file) {
          return reply.status(400).send({ error: "Avatar file is required" });
        }

        if (file.fieldname !== "avatar") {
          file.file.resume();
          return reply.status(400).send({ error: "Invalid avatar field name" });
        }

        const user = await UserService.getUserById(request.user.id);
        if (!user) {
          file.file.resume();
          return reply.status(404).send({ error: "User not found" });
        }

        await fs.promises.mkdir(AVATAR_UPLOAD_DIR, { recursive: true });

        const chunks: Buffer[] = [];
        try {
          for await (const chunk of file.file) {
            if (typeof chunk === "string") {
              chunks.push(Buffer.from(chunk));
            } else {
              chunks.push(chunk as Buffer);
            }
          }
        } catch (streamError) {
          fastify.log.error(streamError);
          return reply
            .status(500)
            .send({ error: "Failed to read avatar stream" });
        }

        const originalBuffer = Buffer.concat(chunks);

        if (originalBuffer.length === 0) {
          return reply.status(400).send({ error: "Avatar file is empty" });
        }

        let detectedExtension: string | undefined;
        try {
          const { fileTypeFromBuffer } = await import("file-type");
          const fileType = await fileTypeFromBuffer(originalBuffer);
          detectedExtension = fileType?.ext;
        } catch (detectionError) {
          fastify.log.error(detectionError);
          return reply
            .status(400)
            .send({ error: "Could not determine avatar file type" });
        }

        if (!detectedExtension || !ALLOWED_EXTENSIONS.has(detectedExtension)) {
          return reply
            .status(400)
            .send({ error: "Only PNG, JPEG, or WebP images are allowed" });
        }

        const MAX_DIMENSION = 4096;
        let sanitizedBuffer: Buffer;
        try {
          // Get image metadata first
          const metadata = await sharp(originalBuffer).metadata();

          // Validate image dimensions
          if (
            !metadata.width ||
            !metadata.height ||
            metadata.width > MAX_DIMENSION ||
            metadata.height > MAX_DIMENSION
          ) {
            return reply.status(400).send({
              error:
                "Image dimensions are too large. Maximum allowed is 4096x4096 pixels",
            });
          }

          sanitizedBuffer = await sharp(originalBuffer)
            .rotate()
            .toFormat(
              OUTPUT_FORMAT,
              OUTPUT_FORMAT === "webp" ? { quality: 90 } : undefined,
            )
            .toBuffer();
        } catch (transformError) {
          fastify.log.error(transformError);
          return reply.status(500).send({ error: "Failed to process avatar" });
        }

        const uniqueSuffix = crypto.randomBytes(6).toString("hex");
        const fileName = `user-${request.user.id}-${Date.now()}-${uniqueSuffix}.${OUTPUT_FORMAT}`;
        const filePath = path.join(AVATAR_UPLOAD_DIR, fileName);

        try {
          await fs.promises.writeFile(filePath, sanitizedBuffer);
        } catch (writeError) {
          fastify.log.error(writeError);
          return reply.status(500).send({ error: "Failed to save avatar" });
        }

        if (user.profile_image_url) {
          const baseDir = path.join(process.cwd(), "uploads", "avatars");
          const normalizedInput = user.profile_image_url.replace(/^\/+/g, "");
          const relativePath = normalizedInput.startsWith("uploads/avatars/")
            ? normalizedInput.slice("uploads/avatars/".length)
            : normalizedInput;
          const resolvedPath = path.resolve(baseDir, relativePath);

          if (
            resolvedPath.startsWith(baseDir + path.sep) &&
            resolvedPath !== baseDir
          ) {
            fs.promises.unlink(resolvedPath).catch((unlinkError) => {
              if (unlinkError && unlinkError.code !== "ENOENT") {
                fastify.log.warn(
                  `Failed to delete previous avatar for user ${user.id}: ${String(unlinkError)}`,
                );
              }
            });
          } else {
            fastify.log.warn(
              `Attempted path traversal detected for user ${user.id}: ${user.profile_image_url}`,
            );
          }
        }

        const relativeUrl = `/uploads/avatars/${fileName}`;
        let result;
        try {
          result = await UserService.updateUserSettings(request.user.id, {
            profile_image_url: relativeUrl,
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
