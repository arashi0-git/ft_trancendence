import { FastifyInstance } from "fastify";
import { UserService } from "../services/userService";
import { CreateUserRequest } from "../types/user";
import {
  LoginRequest,
  TwoFactorVerifyRequest,
  TwoFactorResendRequest,
} from "../types/auth";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { TwoFactorService } from "../services/twoFactorService";
import { sendError } from "../utils/errorResponse";
import { AuthService } from "../services/authService";

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateUserRequest }>(
    "/register",
    async (request, reply) => {
      try {
        const { username, email, password } = request.body;
        // Validation
        if (!username || !email || !password) {
          return sendError(
            reply,
            400,
            "AUTH_MISSING_FIELDS",
            "Username, email, and password are required",
          );
        }

        if (password.length < 6) {
          return sendError(
            reply,
            400,
            "AUTH_PASSWORD_TOO_SHORT",
            "Password must be at least 6 characters long",
          );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return sendError(
            reply,
            400,
            "AUTH_INVALID_EMAIL",
            "Invalid email format",
          );
        }

        if (username.length < 3 || username.length > 20) {
          return sendError(
            reply,
            400,
            "AUTH_USERNAME_LENGTH",
            "Username must be between 3 and 20 characters",
          );
        }

        // Business logic
        const response = await AuthService.register(request.body);
        return reply.status(201).send(response);
      } catch (error) {
        fastify.log.error(error);

        const isError = error instanceof Error;
        const errorMessage = isError ? error.message : "Registration failed";
        const isDuplicate =
          isError &&
          (errorMessage.includes("already exists") ||
            errorMessage.includes("UNIQUE constraint"));

        const statusCode = isDuplicate ? 409 : 500;
        const errorCode = isDuplicate
          ? "AUTH_USER_CONFLICT"
          : "AUTH_REGISTRATION_FAILED";

        return sendError(reply, statusCode, errorCode, errorMessage);
      }
    },
  );

  fastify.post<{ Body: LoginRequest }>("/login", async (request, reply) => {
    try {
      const { email, password } = request.body;
      // Validation
      if (!email || !password) {
        return sendError(
          reply,
          400,
          "AUTH_LOGIN_MISSING_FIELDS",
          "Email and password are required",
        );
      }

      // Business logic
      const response = await AuthService.login({ email, password });
      if (!response) {
        return sendError(
          reply,
          401,
          "AUTH_INVALID_CREDENTIALS",
          "Invalid email or password",
        );
      }
      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return sendError(reply, 500, "AUTH_LOGIN_FAILED", "Login failed");
    }
  });

  fastify.post(
    "/2fa/setup",
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

        // Business logic
        const response = await TwoFactorService.setup(request.user.id);
        return reply.send(response);
      } catch (error) {
        fastify.log.error(error);

        const isError = error instanceof Error;
        const errorMessage = isError
          ? error.message
          : "Failed to enable two-factor authentication";

        let statusCode = 500;
        let errorCode = "AUTH_2FA_ENABLE_FAILED";

        if (isError) {
          if (error.name === "AUTH_USER_NOT_FOUND") {
            statusCode = 404;
            errorCode = error.name;
          } else if (error.name === "AUTH_2FA_ALREADY_ENABLED") {
            statusCode = 400;
            errorCode = error.name;
          }
        }

        return sendError(reply, statusCode, errorCode, errorMessage);
      }
    },
  );

  fastify.post<{ Body: TwoFactorResendRequest }>(
    "/2fa/resend",
    async (request, reply) => {
      try {
        const { token } = request.body || {};
        if (!token) {
          return sendError(
            reply,
            400,
            "AUTH_2FA_TOKEN_REQUIRED",
            "Verification token is required",
          );
        }

        // Business logic
        const challenge = await TwoFactorService.resendChallenge(token);
        return reply.send(challenge);
      } catch (error) {
        fastify.log.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to resend verification code";
        return sendError(reply, 400, "AUTH_2FA_RESEND_FAILED", message);
      }
    },
  );

  fastify.post(
    "/2fa/disable",
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

        // Business logic
        const response = await TwoFactorService.disable(request.user.id);
        return reply.send(response);
      } catch (error) {
        fastify.log.error(error);

        const isError = error instanceof Error;
        const errorMessage = isError
          ? error.message
          : "Failed to disable two-factor authentication";

        let statusCode = 500;
        let errorCode = "AUTH_2FA_DISABLE_FAILED";

        if (isError) {
          if (error.name === "AUTH_USER_NOT_FOUND") {
            statusCode = 404;
            errorCode = error.name;
          } else if (error.name === "AUTH_2FA_NOT_ENABLED") {
            statusCode = 400;
            errorCode = error.name;
          }
        }

        return sendError(reply, statusCode, errorCode, errorMessage);
      }
    },
  );

  fastify.post<{ Body: TwoFactorVerifyRequest }>(
    "/2fa/verify",
    { preHandler: optionalAuth },
    async (request, reply) => {
      try {
        const { token, code } = request.body || {};

        if (!token || !code) {
          return sendError(
            reply,
            400,
            "AUTH_2FA_TOKEN_AND_CODE_REQUIRED",
            "Verification token and code are required",
          );
        }

        // Business logic
        const response = await TwoFactorService.verifyAndProcessChallenge(
          token,
          code,
        );
        return reply.send(response);
      } catch (error) {
        fastify.log.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "Two-factor verification failed";
        return sendError(reply, 400, "AUTH_2FA_VERIFY_FAILED", message);
      }
    },
  );

  fastify.get(
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

        // Business logic
        const user = await UserService.getUserById(request.user.id);

        if (!user) {
          return sendError(reply, 404, "AUTH_USER_NOT_FOUND", "User not found");
        }

        return reply.send({ user });
      } catch (error) {
        fastify.log.error(error);
        return sendError(
          reply,
          500,
          "AUTH_PROFILE_LOAD_FAILED",
          "Failed to get user profile",
        );
      }
    },
  );

  fastify.post(
    "/logout",
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

        // Business logic
        await UserService.updateUserOnlineStatus(request.user.id, false);
        return reply.send({ message: "Logged out successfully" });
      } catch (error) {
        fastify.log.error(error);
        return sendError(reply, 500, "AUTH_LOGOUT_FAILED", "Logout failed");
      }
    },
  );
}
