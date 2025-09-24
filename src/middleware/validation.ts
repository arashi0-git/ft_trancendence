import { FastifyRequest, FastifyReply } from 'fastify';

export interface ValidationSchema {
    body?: object;
    params?: object;
    query?: object;
}

export function validateRequest(schema: ValidationSchema) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        // バリデーションロジックをここに実装
        // 現在は空の実装
    };
}