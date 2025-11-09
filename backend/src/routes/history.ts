import { FastifyInstance } from "fastify";
import { authenticateToken } from "../middleware/auth";
import { GameHistoryModel } from "../models/gameHistory";
import type { CreateGameHistoryInput, MatchType } from "../types/history";

export async function historyRoutes(fastify: FastifyInstance) {
  // Create game history
  fastify.post<{ Body: CreateGameHistoryInput }>(
    "/",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({ error: "User not authenticated" });
        }

        const input = request.body;

        // Validate that the userId matches the authenticated user
        if (input.userId !== request.user.id) {
          return reply
            .status(403)
            .send({ error: "Cannot create history for another user" });
        }

        const matchType = input.matchType ?? "quick";
        if (matchType !== "quick" && matchType !== "tournament") {
          return reply
            .status(400)
            .send({ error: "Invalid match type provided" });
        }

        const tournamentName = input.tournamentName
          ? input.tournamentName.trim()
          : undefined;
        if (matchType === "tournament") {
          if (!tournamentName) {
            return reply.status(400).send({
              error: "Tournament name is required for tournament matches.",
            });
          }
        }

        if (tournamentName && tournamentName.length > 30) {
          return reply.status(400).send({
            error: "Tournament name must be 30 characters or fewer.",
          });
        }

        const history = await GameHistoryModel.create({
          ...input,
          matchType,
          tournamentName: tournamentName ?? null,
        });
        return reply.status(201).send({ history });
      } catch (error) {
        fastify.log.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create game history";
        return reply.status(500).send({ error: message });
      }
    },
  );

  // Get current user's game history
  fastify.get<{
    Querystring: {
      tournamentId?: string;
      isWinner?: string;
      matchType?: string;
      limit?: string;
      offset?: string;
    };
  }>("/", { preHandler: authenticateToken }, async (request, reply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({ error: "User not authenticated" });
      }

      const filters = {
        tournamentId: request.query.tournamentId
          ? Number(request.query.tournamentId)
          : undefined,
        isWinner:
          request.query.isWinner === "true"
            ? true
            : request.query.isWinner === "false"
              ? false
              : undefined,
        matchType: request.query.matchType as MatchType | undefined,
        limit: request.query.limit ? Number(request.query.limit) : undefined,
        offset: request.query.offset ? Number(request.query.offset) : undefined,
      };

      // Validate numeric parameters
      if (filters.tournamentId !== undefined && isNaN(filters.tournamentId)) {
        return reply.status(400).send({ error: "Invalid tournamentId" });
      }
      if (
        filters.limit !== undefined &&
        (isNaN(filters.limit) || filters.limit <= 0 || filters.limit > 10)
      ) {
        return reply.status(400).send({
          error: "Invalid limit (must be between 1 and 10)",
        });
      }
      if (
        filters.offset !== undefined &&
        (isNaN(filters.offset) || filters.offset < 0)
      ) {
        return reply.status(400).send({ error: "Invalid offset" });
      }
      if (
        filters.matchType !== undefined &&
        filters.matchType !== "quick" &&
        filters.matchType !== "tournament"
      ) {
        return reply.status(400).send({ error: "Invalid matchType" });
      }

      const history = await GameHistoryModel.findByUserId(
        request.user.id,
        filters,
      );
      return reply.send({ history });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch game history" });
    }
  });

  // Get current user's stats
  fastify.get(
    "/stats",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({ error: "User not authenticated" });
        }

        const stats = await GameHistoryModel.getStats(request.user.id);
        return reply.send({ stats });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch stats" });
      }
    },
  );
}
