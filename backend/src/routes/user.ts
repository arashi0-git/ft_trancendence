import { FastifyInstance } from "fastify";
import { authenticateToken } from "../middleware/auth";
import { UserService } from "../services/userService";
import { FriendService } from "../services/friendService";
import {
  FriendUserRequest,
  UpdateUserWithPasswordRequest,
} from "../types/user";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import "@fastify/multipart";
import sharp from "sharp";
import { TwoFactorService } from "../services/twoFactorService";
import { sendError } from "../utils/errorResponse";

const AVATAR_UPLOAD_DIR = path.join(process.cwd(), "uploads", "avatars");
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);
const OUTPUT_FORMAT: "png" | "webp" = "webp";

export async function userRoutes(fastify: FastifyInstance) {
  fastify.patch<{ Body: UpdateUserWithPasswordRequest }>(
    "/me",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return sendError(
            reply,
            401,
            "AUTH_UNAUTHORIZED",
            "User not authenticated",
          );
        }

        const payload: UpdateUserWithPasswordRequest = {
          ...(request.body || {}),
        };

        const user = await UserService.getUserById(request.user.id);
        if (!user) {
          return sendError(reply, 404, "AUTH_USER_NOT_FOUND", "User not found");
        }

        const emailCandidate =
          typeof payload.email === "string" ? payload.email : undefined;
        const requiresEmailTwoFactor =
          Boolean(emailCandidate) && user.two_factor_enabled;

        if (requiresEmailTwoFactor) {
          const normalizedEmail = await UserService.validateEmailChange(
            user,
            emailCandidate as string,
          );

          if (normalizedEmail !== user.email.toLowerCase()) {
            const { email: _unused, ...updatesWithoutEmail } = payload;
            const hasAdditionalUpdates = Object.values(
              updatesWithoutEmail,
            ).some((value) => value !== undefined);

            if (hasAdditionalUpdates) {
              return sendError(
                reply,
                400,
                "USER_EMAIL_CHANGE_REQUIRES_2FA",
                "Email changes must be submitted separately when two-factor authentication is enabled.",
              );
            }

            const challenge = await TwoFactorService.startChallenge(
              user,
              "email_change",
              {
                payload: { email: normalizedEmail },
                deliveryEmail: normalizedEmail,
                messageOverride:
                  TwoFactorService.buildEmailChangeMessage(normalizedEmail),
              },
            );

            return reply.send(challenge);
          }
        }

        const result = await UserService.updateUserSettings(
          request.user.id,
          payload,
        );

        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update user settings";
        let statusCode = 500;
        let code = "USER_UPDATE_FAILED";

        if (error instanceof Error) {
          if (message.includes("not authenticated")) {
            statusCode = 401;
            code = "AUTH_UNAUTHORIZED";
          } else if (message.includes("not found")) {
            statusCode = 404;
            code = "AUTH_USER_NOT_FOUND";
          } else if (
            message.includes("incorrect") ||
            message.includes("required") ||
            message.includes("already")
          ) {
            statusCode = 400;
            code = "USER_UPDATE_INVALID";
          }
        }

        return sendError(reply, statusCode, code, message);
      }
    },
  );

  fastify.post(
    "/me/avatar",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return sendError(
            reply,
            401,
            "AUTH_UNAUTHORIZED",
            "User not authenticated",
          );
        }

        const file = await request.file({ limits: { files: 1 } });

        if (!file) {
          return sendError(
            reply,
            400,
            "AVATAR_REQUIRED",
            "Avatar file is required",
          );
        }

        if (file.fieldname !== "avatar") {
          file.file.resume();
          return sendError(
            reply,
            400,
            "AVATAR_INVALID_FIELD",
            "Invalid avatar field name",
          );
        }

        const user = await UserService.getUserById(request.user.id);
        if (!user) {
          file.file.resume();
          return sendError(reply, 404, "AUTH_USER_NOT_FOUND", "User not found");
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
          return sendError(
            reply,
            500,
            "AVATAR_STREAM_ERROR",
            "Failed to read avatar stream",
          );
        }

        const originalBuffer = Buffer.concat(chunks);

        if (originalBuffer.length === 0) {
          return sendError(
            reply,
            400,
            "AVATAR_EMPTY_FILE",
            "Avatar file is empty",
          );
        }

        let detectedExtension: string | undefined;
        try {
          const { fileTypeFromBuffer } = await import("file-type");
          const fileType = await fileTypeFromBuffer(originalBuffer);
          detectedExtension = fileType?.ext;
        } catch (detectionError) {
          fastify.log.error(detectionError);
          return sendError(
            reply,
            400,
            "AVATAR_UNKNOWN_TYPE",
            "Could not determine avatar file type",
          );
        }

        if (!detectedExtension || !ALLOWED_EXTENSIONS.has(detectedExtension)) {
          return sendError(
            reply,
            400,
            "AVATAR_UNSUPPORTED_TYPE",
            "Only PNG, JPEG, or WebP images are allowed",
          );
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
            return sendError(
              reply,
              400,
              "AVATAR_DIMENSIONS_TOO_LARGE",
              "Image dimensions are too large. Maximum allowed is 4096x4096 pixels",
            );
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
          return sendError(
            reply,
            500,
            "AVATAR_PROCESSING_FAILED",
            "Failed to process avatar",
          );
        }

        const uniqueSuffix = crypto.randomBytes(6).toString("hex");
        const fileName = `user-${request.user.id}-${Date.now()}-${uniqueSuffix}.${OUTPUT_FORMAT}`;
        const filePath = path.join(AVATAR_UPLOAD_DIR, fileName);

        try {
          await fs.promises.writeFile(filePath, sanitizedBuffer);
        } catch (writeError) {
          fastify.log.error(writeError);
          return sendError(
            reply,
            500,
            "AVATAR_SAVE_FAILED",
            "Failed to save avatar",
          );
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
          return sendError(
            reply,
            413,
            "AVATAR_TOO_LARGE",
            "Avatar file exceeds the 2MB size limit",
          );
        }

        fastify.log.error(error);
        return sendError(
          reply,
          500,
          "AVATAR_UPLOAD_FAILED",
          "Failed to upload avatar",
        );
      }
    },
  );

  fastify.get(
    "/me/friends",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return sendError(
            reply,
            401,
            "AUTH_UNAUTHORIZED",
            "User not authenticated",
          );
        }

        const friends = await FriendService.listFriends(request.user.id);
        return reply.send({
          friends: FriendService.toFriendSummaries(friends),
        });
      } catch (error) {
        fastify.log.error(error);
        return sendError(
          reply,
          500,
          "FRIENDS_LIST_FAILED",
          "Failed to load friends list",
        );
      }
    },
  );

  fastify.post<{ Body: FriendUserRequest }>(
    "/me/friends",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return sendError(
            reply,
            401,
            "AUTH_UNAUTHORIZED",
            "User not authenticated",
          );
        }

        const friend = await FriendService.addFriendByUsername(
          request.user.id,
          request.body?.username || "",
        );

        return reply.send({
          user: FriendService.toFriendSummary(friend),
        });
      } catch (error) {
        fastify.log.error(error);
        const message =
          error instanceof Error ? error.message : "Failed to add friend";

        let statusCode = 500;
        let code = "FRIENDS_ADD_FAILED";
        if (message.includes("required")) {
          statusCode = 400;
          code = "FRIENDS_INVALID_INPUT";
        } else if (message.includes("cannot") || message.includes("already")) {
          statusCode = 400;
          code = "FRIENDS_CONFLICT";
        } else if (message.includes("not found")) {
          statusCode = 404;
          code = "AUTH_USER_NOT_FOUND";
        }

        return sendError(reply, statusCode, code, message);
      }
    },
  );

  fastify.delete<{ Params: { userId: string } }>(
    "/me/friends/:userId",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return sendError(
            reply,
            401,
            "AUTH_UNAUTHORIZED",
            "User not authenticated",
          );
        }

        const userId = Number(request.params.userId);
        if (!Number.isInteger(userId) || userId <= 0) {
          return sendError(reply, 400, "FRIENDS_INVALID_ID", "Invalid user id");
        }

        await FriendService.removeFriend(request.user.id, userId);
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        const message =
          error instanceof Error ? error.message : "Failed to remove friend";

        const statusCode = message.includes("not found") ? 404 : 500;
        const code =
          statusCode === 404 ? "AUTH_USER_NOT_FOUND" : "FRIENDS_REMOVE_FAILED";
        return sendError(reply, statusCode, code, message);
      }
    },
  );
}
