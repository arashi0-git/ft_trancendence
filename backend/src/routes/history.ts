import { FastifyInstance } from "fastify";
import { authenticateToken } from "../middleware/auth";
import { GameHistoryModel } from "../models/gameHistory";
import type { CreateGameHistoryInput, MatchType } from "../types/history";
import { sendError } from "../utils/errorResponse";

export async function historyRoutes(fastify: FastifyInstance) {
  // Create game history
  fastify.post<{ Body: CreateGameHistoryInput }>(
    "/",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return sendError(
            reply,
            401,
            "AUTH_UNAUTHORIZED",
            "User not authenticated",
          );
        }

        const input = request.body;

        // Validate that the userId matches the authenticated user
        if (input.userId !== request.user.id) {
          return sendError(
            reply,
            403,
            "HISTORY_FORBIDDEN_FOR_OTHER_USER",
            "Cannot create history for another user",
          );
        }

        const matchType = input.matchType ?? "quick";
        if (matchType !== "quick" && matchType !== "tournament") {
          return sendError(
            reply,
            400,
            "HISTORY_INVALID_MATCH_TYPE",
            "Invalid match type provided",
          );
        }

        const tournamentName = input.tournamentName
          ? input.tournamentName.trim()
          : undefined;
        if (matchType === "tournament") {
          if (!tournamentName) {
            return sendError(
              reply,
              400,
              "HISTORY_TOURNAMENT_NAME_REQUIRED",
              "Tournament name is required for tournament matches.",
            );
          }
        }

        if (tournamentName && tournamentName.length > 30) {
          return sendError(
            reply,
            400,
            "HISTORY_TOURNAMENT_NAME_TOO_LONG",
            "Tournament name must be 30 characters or fewer.",
          );
        }

        // business logic
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
        return sendError(reply, 500, "HISTORY_CREATE_FAILED", message);
      }
    },
  );

  fastify.get<{
    Querystring: {
      matchType?: string;
      limit?: string;
      offset?: string;
    };
  }>("/", { preHandler: authenticateToken }, async (request, reply) => {
    try {
      if (!request.user) {
        return sendError(
          reply,
          401,
          "AUTH_UNAUTHORIZED",
          "User not authenticated",
        );
      }

      const filters = {
        matchType: request.query.matchType as MatchType | undefined,
        limit: request.query.limit ? Number(request.query.limit) : undefined,
        offset: request.query.offset ? Number(request.query.offset) : undefined,
      };

      // Validate numeric parameters
      if (
        filters.limit !== undefined &&
        (isNaN(filters.limit) || filters.limit <= 0 || filters.limit > 10)
      ) {
        return sendError(
          reply,
          400,
          "HISTORY_INVALID_LIMIT",
          "Invalid limit (must be between 1 and 10)",
        );
      }
      if (
        filters.offset !== undefined &&
        (isNaN(filters.offset) || filters.offset < 0)
      ) {
        return sendError(
          reply,
          400,
          "HISTORY_INVALID_OFFSET",
          "Invalid offset",
        );
      }
      if (
        filters.matchType !== undefined &&
        filters.matchType !== "quick" &&
        filters.matchType !== "tournament"
      ) {
        return sendError(
          reply,
          400,
          "HISTORY_INVALID_MATCH_TYPE",
          "Invalid matchType",
        );
      }

      const history = await GameHistoryModel.findByUserId(
        request.user.id,
        filters,
      );
      return reply.send({ history });
    } catch (error) {
      fastify.log.error(error);
      return sendError(
        reply,
        500,
        "HISTORY_FETCH_FAILED",
        "Failed to fetch game history",
      );
    }
  });

  // Get current user's stats
  fastify.get(
    "/stats",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        if (!request.user) {
          return sendError(
            reply,
            401,
            "AUTH_UNAUTHORIZED",
            "User not authenticated",
          );
        }

        const stats = await GameHistoryModel.getStats(request.user.id);
        return reply.send({ stats });
      } catch (error) {
        fastify.log.error(error);
        return sendError(
          reply,
          500,
          "HISTORY_STATS_FAILED",
          "Failed to fetch stats",
        );
      }
    },
  );
}
