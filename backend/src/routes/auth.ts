import { FastifyInstance } from "fastify";
import { UserService } from "../services/userService";
import { AuthUtils } from "../utils/auth";
import {
  CreateUserRequest,
  LoginRequest,
  AuthResponse,
  TwoFactorChallengeResponse,
  TwoFactorVerifyRequest,
  DisableTwoFactorRequest,
} from "../types/user";
import { authenticateToken, optionalAuth } from "../middleware/auth";
import { TwoFactorService } from "../services/twoFactorService";

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateUserRequest }>(
    "/register",
    async (request, reply) => {
      try {
        const { username, email, password } = request.body;

        if (!username || !email || !password) {
          return reply
            .status(400)
            .send({ error: "Username, email, and password are required" });
        }

        if (password.length < 6) {
          return reply
            .status(400)
            .send({ error: "Password must be at least 6 characters long" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return reply.status(400).send({ error: "Invalid email format" });
        }

        if (username.length < 3 || username.length > 20) {
          return reply
            .status(400)
            .send({ error: "Username must be between 3 and 20 characters" });
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

        return reply.status(statusCode).send({
          error: error instanceof Error ? error.message : "Registration failed",
        });
      }
    },
  );

  fastify.post<{ Body: LoginRequest }>("/login", async (request, reply) => {
    try {
      const { email, password } = request.body;

      if (!email || !password) {
        return reply
          .status(400)
          .send({ error: "Email and password are required" });
      }

      const user = await UserService.authenticateUser(email, password);

      if (!user) {
        return reply.status(401).send({ error: "Invalid email or password" });
      }

      if (user.two_factor_enabled) {
        const challenge = await TwoFactorService.startChallenge(user, "login");

        const challengeResponse: TwoFactorChallengeResponse = {
          requiresTwoFactor: true,
          twoFactorToken: challenge.token,
          delivery: "email",
          expiresIn: 10 * 60,
          message: "A verification code has been sent to your email address.",
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
      return reply.status(500).send({ error: "Login failed" });
    }
  });

  fastify.post(
    "/2fa/setup",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({ error: "User not authenticated" });
        }

        const user = await UserService.getUserById(request.user.id);
        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        if (user.two_factor_enabled) {
          return reply
            .status(400)
            .send({ error: "Two-factor authentication is already enabled" });
        }

        const challenge = await TwoFactorService.startChallenge(user, "enable");

        const response: TwoFactorChallengeResponse = {
          requiresTwoFactor: true,
          twoFactorToken: challenge.token,
          delivery: "email",
          expiresIn: 10 * 60,
          message:
            "A verification code has been sent to your email. Enter it to finish enabling 2FA.",
        };

        return reply.send(response);
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(500)
          .send({ error: "Failed to start 2FA setup process" });
      }
    },
  );

  fastify.post<{ Body: DisableTwoFactorRequest }>(
    "/2fa/disable",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({ error: "User not authenticated" });
        }

        const { currentPassword } = request.body || {};
        if (!currentPassword) {
          return reply
            .status(400)
            .send({ error: "Current password is required" });
        }

        const user = await UserService.getUserById(request.user.id);
        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        if (!user.two_factor_enabled) {
          return reply
            .status(400)
            .send({ error: "Two-factor authentication is not enabled" });
        }

        const passwordValid = await UserService.verifyUserPassword(
          request.user.id,
          currentPassword,
        );

        if (!passwordValid) {
          return reply.status(401).send({ error: "Password is incorrect" });
        }

        const challenge = await TwoFactorService.startChallenge(
          user,
          "disable",
        );

        const response: TwoFactorChallengeResponse = {
          requiresTwoFactor: true,
          twoFactorToken: challenge.token,
          delivery: "email",
          expiresIn: 10 * 60,
          message:
            "Enter the verification code sent to your email to disable 2FA.",
        };

        return reply.send(response);
      } catch (error) {
        fastify.log.error(error);
        return reply
          .status(500)
          .send({ error: "Failed to start 2FA disable process" });
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
          return reply
            .status(400)
            .send({ error: "Verification token and code are required" });
        }

        const result = await TwoFactorService.verifyChallenge(token, code);

        if (result.purpose === "login") {
          const authToken = AuthUtils.generateToken(result.user);

          const response: AuthResponse = {
            user: UserService.toPublicUser(result.user),
            token: authToken,
          };

          return reply.send(response);
        }

        if (!request.user || request.user.id !== result.user.id) {
          return reply
            .status(403)
            .send({ error: "Not authorized to complete this action" });
        }

        return reply.send({
          user: UserService.toPublicUser(result.user),
          twoFactorEnabled: result.purpose === "enable",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(400).send({
          error:
            error instanceof Error
              ? error.message
              : "Two-factor verification failed",
        });
      }
    },
  );

  fastify.get(
    "/me",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({ error: "User not authenticated" });
        }

        const user = await UserService.getUserById(request.user.id);

        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        return reply.send({ user });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to get user profile" });
      }
    },
  );

  fastify.post(
    "/logout",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({ error: "User not authenticated" });
        }

        await UserService.updateUserOnlineStatus(request.user.id, false);

        return reply.send({ message: "Logged out successfully" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Logout failed" });
      }
    },
  );
}
