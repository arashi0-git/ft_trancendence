import { FastifyReply } from "fastify";

export interface ApiError {
  code: string;
  message: string;
}

export interface ErrorResponseBody {
  error: ApiError;
}

export function buildError(code: string, message: string): ErrorResponseBody {
  return {
    error: {
      code,
      message,
    },
  };
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
) {
  return reply.status(statusCode).send(buildError(code, message));
}
