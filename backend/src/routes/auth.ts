import { FastifyInstance } from "fastify";
import { UserService } from "../services/userService";
import { AuthUtils } from "../utils/auth";
import { CreateUserRequest } from "../types/user";
import {
  LoginRequest,
  AuthResponse,
  TwoFactorChallengeResponse,
  TwoFactorVerifyRequest,
  TwoFactorResendRequest,
  TwoFactorVerificationResponse,
} from "../types/auth";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { TwoFactorService } from "../services/twoFactorService";
import { sendError } from "../utils/errorResponse";

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateUserRequest }>(
    "/register",
    async (request, reply) => {
      try {
        const { username, email, password } = request.body;

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

        // ^  start of string anchor
        // [^\s@]+  one or more characters that are not whitespace or '@'
        // $  end of string anchor
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

        const user = await UserService.createUser({
          username,
          email,
          password,
        });
        await UserService.updateUserOnlineStatus(user.id, true);
        const updatedUser = await UserService.getUserById(user.id);
        const token = AuthUtils.generateToken(user);

        const response: AuthResponse = {
          user: UserService.toPublicUser(updatedUser ?? user),
          token,
        };

        return reply.status(201).send(response);
      } catch (error) {
        fastify.log.error(error);
        const statusCode =
          error instanceof Error &&
          (error.message.includes("already exists") ||
            error.message.includes("UNIQUE constraint"))
            ? 409
            : 400;

        const message =
          error instanceof Error ? error.message : "Registration failed";
        const errorCode =
          statusCode === 409
            ? "AUTH_USER_CONFLICT"
            : "AUTH_REGISTRATION_FAILED";

        return sendError(reply, statusCode, errorCode, message);
      }
    },
  );

  fastify.post<{ Body: LoginRequest }>("/login", async (request, reply) => {
    try {
      const { email, password } = request.body;

      if (!email || !password) {
        return sendError(
          reply,
          400,
          "AUTH_LOGIN_MISSING_FIELDS",
          "Email and password are required",
        );
      }

      const user = await UserService.authenticateUser(email, password);

      if (!user) {
        return sendError(
          reply,
          401,
          "AUTH_INVALID_CREDENTIALS",
          "Invalid email or password",
        );
      }

      if (user.two_factor_enabled) {
        const challenge = await TwoFactorService.startLoginChallenge(user);

        const challengeResponse: TwoFactorChallengeResponse = {
          requiresTwoFactor: true,
          twoFactorToken: challenge.token,
          expiresIn: challenge.expiresIn,
          message: challenge.message,
          destination: challenge.destination,
          purpose: challenge.purpose,
        };

        return reply.send(challengeResponse);
      }

      const loggedInUser =
        (await UserService.markUserLoggedIn(user.id)) ?? user;

      const token = AuthUtils.generateToken(loggedInUser);

      const response: AuthResponse = {
        user: UserService.toPublicUser(loggedInUser),
        token,
      };

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

        const user = await UserService.getUserById(request.user.id);
        if (!user) {
          return sendError(reply, 404, "AUTH_USER_NOT_FOUND", "User not found");
        }

        if (user.two_factor_enabled) {
          return sendError(
            reply,
            400,
            "AUTH_2FA_ALREADY_ENABLED",
            "Two-factor authentication is already enabled",
          );
        }

        const challenge = await TwoFactorService.startChallenge(
          user,
          "enable_2fa",
        );

        return reply.send({
          requiresTwoFactor: true,
          twoFactorToken: challenge.token,
          expiresIn: challenge.expiresIn,
          message: challenge.message,
          destination: challenge.destination,
          purpose: challenge.purpose,
        });
      } catch (error) {
        fastify.log.error(error);
        return sendError(
          reply,
          500,
          "AUTH_2FA_ENABLE_FAILED",
          "Failed to enable two-factor authentication",
        );
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

        const challenge = await TwoFactorService.resendChallenge(token);

        const response: TwoFactorChallengeResponse = {
          requiresTwoFactor: true,
          twoFactorToken: challenge.token,
          expiresIn: challenge.expiresIn,
          message: challenge.message,
          destination: challenge.destination,
          purpose: challenge.purpose,
        };

        return reply.send(response);
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

        const user = await UserService.getUserById(request.user.id);
        if (!user) {
          return sendError(reply, 404, "AUTH_USER_NOT_FOUND", "User not found");
        }

        if (!user.two_factor_enabled) {
          return sendError(
            reply,
            400,
            "AUTH_2FA_NOT_ENABLED",
            "Two-factor authentication is not enabled",
          );
        }

        const challenge = await TwoFactorService.startChallenge(
          user,
          "disable_2fa",
        );

        return reply.send({
          requiresTwoFactor: true,
          twoFactorToken: challenge.token,
          expiresIn: challenge.expiresIn,
          message: challenge.message,
          destination: challenge.destination,
          purpose: challenge.purpose,
        });
      } catch (error) {
        fastify.log.error(error);
        return sendError(
          reply,
          500,
          "AUTH_2FA_DISABLE_FAILED",
          "Failed to disable two-factor authentication",
        );
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

        const { challenge, user } = await TwoFactorService.verifyChallenge(
          token,
          code,
        );

        let updatedUser = user;
        let issuedToken: string;

        switch (challenge.purpose) {
          case "login": {
            const loggedInUser =
              (await UserService.markUserLoggedIn(user.id)) ?? user;
            updatedUser = loggedInUser;
            issuedToken = AuthUtils.generateToken(updatedUser);
            break;
          }
          case "enable_2fa": {
            updatedUser = await UserService.setTwoFactorEnabledStatus(
              user.id,
              true,
            );
            issuedToken = AuthUtils.generateToken(updatedUser);
            break;
          }
          case "disable_2fa": {
            updatedUser = await UserService.setTwoFactorEnabledStatus(
              user.id,
              false,
            );
            issuedToken = AuthUtils.generateToken(updatedUser);
            break;
          }
          case "email_change": {
            const payload = TwoFactorService.parsePayload<{ email: string }>(
              challenge.payload,
            );
            if (!payload?.email) {
              throw new Error("Pending email update data missing");
            }

            updatedUser = await UserService.applyEmailChange(
              user.id,
              payload.email,
            );
            issuedToken = AuthUtils.generateToken(updatedUser);
            break;
          }
          default: {
            throw new Error("Unsupported verification purpose");
          }
        }

        const response: TwoFactorVerificationResponse = {
          user: UserService.toPublicUser(updatedUser),
          token: issuedToken,
          operation: challenge.purpose,
        };

        if (challenge.purpose !== "login") {
          response.twoFactorEnabled = updatedUser.two_factor_enabled;
        }

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

        await UserService.updateUserOnlineStatus(request.user.id, false);

        return reply.send({ message: "Logged out successfully" });
      } catch (error) {
        fastify.log.error(error);
        return sendError(reply, 500, "AUTH_LOGOUT_FAILED", "Logout failed");
      }
    },
  );
}
