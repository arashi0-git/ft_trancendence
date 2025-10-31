import { FastifyInstance } from "fastify";
import { UserService } from "../services/userService";
import { AuthUtils } from "../utils/auth";
import { CreateUserRequest, LoginRequest, AuthResponse } from "../types/user";
import { authenticateToken } from "../middleware/auth";

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

      const token = AuthUtils.generateToken(user);

      const response: AuthResponse = {
        user: UserService.toPublicUser(user),
        token,
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Login failed" });
    }
  });

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
