import { FastifyRequest, FastifyReply } from "fastify";
import { AuthUtils } from "../utils/auth";
import { UserService } from "../services/userService";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: number;
      username: string;
      email: string;
    };
  }
}

export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const token = AuthUtils.extractTokenFromHeader(
      request.headers.authorization,
    );

    if (!token) {
      return reply.status(401).send({ error: "Access token required" });
    }

    const decoded = AuthUtils.verifyToken(token);

    const user = await UserService.getUserById(decoded.id);
    if (!user) {
      return reply.status(401).send({ error: "User not found" });
    }

    // Check token version to invalidate old tokens
    const userWithVersion = user as any;
    if (
      decoded.tokenVersion !== undefined &&
      userWithVersion.token_version !== undefined
    ) {
      if (decoded.tokenVersion < userWithVersion.token_version) {
        return reply.status(401).send({ error: "Token has been invalidated" });
      }
    }

    request.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };
  } catch (error) {
    return reply.status(401).send({ error: "Invalid token" });
  }
}

export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const token = AuthUtils.extractTokenFromHeader(
      request.headers.authorization,
    );

    if (!token) {
      return;
    }

    const decoded = AuthUtils.verifyToken(token);
    const user = await UserService.getUserById(decoded.id);
    if (!user) {
      return;
    }

    const userWithVersion = user as any;
    if (
      decoded.tokenVersion !== undefined &&
      userWithVersion.token_version !== undefined &&
      decoded.tokenVersion < userWithVersion.token_version
    ) {
      return;
    }

    request.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };
  } catch (error) {
    // Swallow errors for optional auth
  }
}
