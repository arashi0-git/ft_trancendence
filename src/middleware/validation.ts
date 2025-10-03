import { FastifyRequest, FastifyReply } from "fastify";

export interface ValidationSchema {
  body?: object;
  params?: object;
  query?: object;
}

export function validateRequest(_schema: ValidationSchema) {
  return async (_request: FastifyRequest, _reply: FastifyReply) => {
    // バリデーションロジックをここに実装
    // 現在は空の実装
  };
}
