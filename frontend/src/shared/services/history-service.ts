import type {
  GameHistory,
  GameHistoryStats,
  GameHistoryFilters,
  MatchType,
} from "../types/history";

declare const __API_BASE_URL__: string | undefined;

const API_BASE_URL =
  (typeof __API_BASE_URL__ !== "undefined" && __API_BASE_URL__) ||
  process.env.API_BASE_URL ||
  "/api";

interface CreateGameHistoryRequest {
  userId: number;
  tournamentId?: number | null;
  teammate?: string | null;
  myScore: number;
  opponentScore: number;
  isWinner: boolean;
  opponentInfo: string;
  finishedAt: string;
  matchType?: MatchType;
  tournamentRound?: string | null;
  tournamentName?: string | null;
}

interface CreateGameHistoryResponse {
  history: GameHistory;
}

interface GameHistoryResponse {
  history: GameHistory[];
}

interface GameHistoryStatsResponse {
  stats: GameHistoryStats;
}

export class HistoryService {
  private static getAuthHeaders(): HeadersInit {
    const token =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("auth_token")
        : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Save a game to history
   */
  static async saveGame(data: CreateGameHistoryRequest): Promise<GameHistory> {
    try {
      const payload: CreateGameHistoryRequest = {
        ...data,
        matchType: data.matchType ?? "quick",
        tournamentName: data.tournamentName ?? "tournament",
      };
      const response = await fetch(`${API_BASE_URL}/history`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `Failed to save game history`);
      }

      const result: CreateGameHistoryResponse = await response.json();
      return result.history;
    } catch (error) {
      console.error("Error saving game history:", error);
      throw error;
    }
  }

  /**
   * Get current user's game history
   */
  static async getMyHistory(
    filters?: GameHistoryFilters,
  ): Promise<GameHistory[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.tournamentId !== undefined) {
        params.append("tournamentId", filters.tournamentId.toString());
      }
      if (filters?.isWinner !== undefined) {
        params.append("isWinner", filters.isWinner.toString());
      }
      if (filters?.matchType) {
        params.append("matchType", filters.matchType);
      }
      if (filters?.limit !== undefined) {
        params.append("limit", filters.limit.toString());
      }
      if (filters?.offset !== undefined) {
        params.append("offset", filters.offset.toString());
      }

      const queryString = params.toString();
      const url = queryString
        ? `${API_BASE_URL}/history?${queryString}`
        : `${API_BASE_URL}/history`;

      const response = await fetch(url, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `Failed to fetch game history`);
      }

      const result: GameHistoryResponse = await response.json();
      const normalizedHistory: GameHistory[] = result.history.map((game) => {
        const matchType: MatchType =
          game.matchType === "tournament" ? "tournament" : "quick";
        return {
          ...game,
          matchType,
        };
      });
      return normalizedHistory;
    } catch (error) {
      console.error("Error fetching game history:", error);
      throw error;
    }
  }

  /**
   * Get current user's stats
   */
  static async getMyStats(): Promise<GameHistoryStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/history/stats`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `Failed to fetch stats`);
      }

      const result: GameHistoryStatsResponse = await response.json();
      return result.stats;
    } catch (error) {
      console.error("Error fetching stats:", error);
      throw error;
    }
  }
}
