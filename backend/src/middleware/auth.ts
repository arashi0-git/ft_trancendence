import { FastifyRequest, FastifyReply } from "fastify";
import { AuthUtils } from "../utils/auth";
import { UserService } from "../services/userService";
import { sendError } from "../utils/errorResponse";

// add user property
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
      return sendError(
        reply,
        401,
        "AUTH_TOKEN_REQUIRED",
        "Access token required",
      );
    }

    const decoded = AuthUtils.verifyToken(token);
    const user = await UserService.getUserById(decoded.id);
    if (!user) {
      return sendError(reply, 401, "AUTH_USER_NOT_FOUND", "User not found");
    }

    if (decoded.tokenVersion < user.token_version) {
      return sendError(
        reply,
        401,
        "AUTH_TOKEN_INVALIDATED",
        "Token has been invalidated",
      );
    }

    request.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };
  } catch (error) {
    // Use error to determine specific failure type without logging sensitive details
    const isExpired =
      error instanceof Error && error.message.includes("expired");
    const errorMessage = isExpired ? "Token expired" : "Invalid token";

    return sendError(reply, 401, "AUTH_INVALID_TOKEN", errorMessage);
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

    if (decoded.tokenVersion < user.token_version) {
      return;
    }

    request.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };
  } catch {
    // Swallow errors for optional auth
  }
}
