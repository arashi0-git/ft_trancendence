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

// HTTPステータスコード：
// 200 - OK（成功）
// 201 - Created（作成成功）
// 400 - Bad Request（リクエストエラー）
// 401 - Unauthorized（認証エラー）
// 403 - Forbidden（権限なし）
// 404 - Not Found（見つからない）
// 500 - Internal Server Error（サーバーエラー）

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
) {
  return reply.status(statusCode).send(buildError(code, message));
}
