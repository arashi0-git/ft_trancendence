import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthUtils } from '../utils/auth';
import { UserService } from '../services/userService';

declare module 'fastify' {
    interface FastifyRequest {
        user?: {
            id: number;
            username: string;
            email: string;
        };
    }
}

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
    try {
        const token = AuthUtils.extractTokenFromHeader(request.headers.authorization);

        if (!token) {
            return reply.status(401).send({ error: 'Access token required' });
        }

        const decoded = AuthUtils.verifyToken(token);

        const user = await UserService.getUserById(decoded.id);
        if (!user) {
            return reply.status(401).send({ error: 'User not found' });
        }

        request.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email
        };
    } catch (error) {
        return reply.status(401).send({ error: 'Invalid token' });
    }
}

export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
    try {
        const token = AuthUtils.extractTokenFromHeader(request.headers.authorization);

        if (token) {
            const decoded = AuthUtils.verifyToken(token);
            const user = await UserService.getUserById(decoded.id);

            if(user) {
                request.user = {
                    id: decoded.id,
                    username: decoded.username,
                    email: decoded.email
                };
            }
        }
    } catch (error) {

    }
}