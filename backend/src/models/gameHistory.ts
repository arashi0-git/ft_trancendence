import { db } from "../database/connection";
import type {
  GameHistory,
  GameHistoryStats,
  GameHistoryFilters,
  CreateGameHistoryInput,
  MatchType,
} from "../types/history";

interface GameHistoryRecord {
  id: number;
  user_id: number;
  tournament_id: number | null;
  teammate: string | null;
  match_type: MatchType;
  tournament_round: string | null;
  tournament_name: string | null;
  my_score: number;
  opponent_score: number;
  is_winner: number; // SQLite stores boolean as 0/1
  opponent_info: string;
  finished_at: string;
}

function toGameHistory(record: GameHistoryRecord): GameHistory {
  return {
    id: record.id,
    userId: record.user_id,
    tournamentId: record.tournament_id,
    teammate: record.teammate,
    matchType: record.match_type,
    tournamentRound: record.tournament_round,
    tournamentName: record.tournament_name,
    myScore: record.my_score,
    opponentScore: record.opponent_score,
    isWinner: Boolean(record.is_winner),
    opponentInfo: record.opponent_info,
    finishedAt: record.finished_at,
  };
}

export class GameHistoryModel {
  static async create(input: CreateGameHistoryInput): Promise<GameHistory> {
    await db.run(
      `INSERT INTO game_history (user_id, tournament_id, teammate, match_type, tournament_round, tournament_name, my_score, opponent_score, is_winner, opponent_info, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.userId,
        input.tournamentId ?? null,
        input.teammate ?? null,
        input.matchType ?? "quick",
        input.tournamentRound ?? null,
        input.tournamentName ?? null,
        input.myScore,
        input.opponentScore,
        input.isWinner ? 1 : 0,
        input.opponentInfo,
        input.finishedAt,
      ],
    );

    const record = await db.get<GameHistoryRecord>(
      `SELECT * FROM game_history WHERE id = last_insert_rowid()`,
    );

    if (!record) {
      throw new Error("Failed to retrieve game history after creation");
    }

    return toGameHistory(record);
  }

  static async findByUserId(
    userId: number,
    filters?: GameHistoryFilters,
  ): Promise<GameHistory[]> {
    let query = `SELECT * FROM game_history WHERE user_id = ?`;
    const params: (number | string)[] = [userId];

    if (filters?.matchType) {
      query += ` AND match_type = ?`;
      params.push(filters.matchType);
    }

    query += ` ORDER BY finished_at DESC`;

    const limit = filters?.limit;
    const offset = filters?.offset;
    const hasLimit = limit !== undefined;
    const hasOffset = offset !== undefined;

    if (hasLimit && limit !== undefined) {
      query += ` LIMIT ?`;
      params.push(limit);
    }

    if (hasOffset && offset !== undefined) {
      if (!hasLimit) {
        query += ` LIMIT -1`;
      }
      query += ` OFFSET ?`;
      params.push(offset);
    }

    const records = await db.all<GameHistoryRecord>(query, params);
    return records.map(toGameHistory);
  }

  static async getStats(userId: number): Promise<GameHistoryStats> {
    const stats = await db.get<{
      total_games: number;
      wins: number;
      losses: number;
    }>(
      `SELECT
        COUNT(*) as total_games,
        SUM(CASE WHEN is_winner = 1 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN is_winner = 0 THEN 1 ELSE 0 END) as losses
       FROM game_history
       WHERE user_id = ?`,
      [userId],
    );

    if (!stats) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
      };
    }

    const totalGames = stats.total_games ?? 0;
    const wins = stats.wins ?? 0;
    const losses = stats.losses ?? 0;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    return {
      totalGames,
      wins,
      losses,
      winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
    };
  }

  static async findById(id: number): Promise<GameHistory | null> {
    const record = await db.get<GameHistoryRecord>(
      `SELECT * FROM game_history WHERE id = ?`,
      [id],
    );

    return record ? toGameHistory(record) : null;
  }
}
