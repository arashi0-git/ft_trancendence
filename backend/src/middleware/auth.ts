import { FastifyRequest, FastifyReply } from "fastify";
import { AuthUtils } from "../utils/auth";
import { UserService } from "../services/userService";
import { UserRecord } from "../models/user";

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
    const userRecord = user as unknown as UserRecord;
    if (
      decoded.tokenVersion !== undefined &&
      userRecord.token_version !== undefined
    ) {
      if (decoded.tokenVersion < userRecord.token_version) {
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
  _reply: FastifyReply,
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

    const userRecord = user as unknown as UserRecord;
    if (
      decoded.tokenVersion !== undefined &&
      userRecord.token_version !== undefined &&
      decoded.tokenVersion < userRecord.token_version
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
