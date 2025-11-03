export interface GameHistory {
  id: number;
  userId: number;
  tournamentId?: number | null;
  teammate?: string | null;
  myScore: number;
  opponentScore: number;
  isWinner: boolean;
  opponentInfo: string;
  finishedAt: string;
}

export interface GameHistoryStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface GameHistoryFilters {
  userId?: number;
  tournamentId?: number;
  isWinner?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateGameHistoryInput {
  userId: number;
  tournamentId?: number | null;
  teammate?: string | null;
  myScore: number;
  opponentScore: number;
  isWinner: boolean;
  opponentInfo: string;
  finishedAt: string;
}
