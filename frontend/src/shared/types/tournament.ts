export interface Tournament {
  id: string;
  name: string;
  players: TournamentPlayer[];
  matches: Match[];
  status: "registration" | "in_progress" | "completed";
  maxPlayers: number;
  currentRound: number;
  winner?: TournamentPlayer;
  createdAt: Date;
}

export interface TournamentPlayer {
  id: string;
  alias: string;
  userId?: number;
  isEliminated: boolean;
  wins: number;
  losses: number;
  isAI: boolean;
  aiDifficulty?: "easy" | "medium" | "hard";
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  score?: {
    player1: number;
    player2: number;
  };
  status: "pending" | "in_progress" | "completed";
  playedAt?: string;
}

export interface TournamentConfig {
  maxPlayers: number;
  gameConfig: {
    maxScore: number;
    ballSpeed: number;
    paddleSpeed: number;
  };
}
export interface PlayerOption {
  id: string;
  displayName: string;
  isAI: boolean;
  aiDifficulty?: "easy" | "medium" | "hard";
  userId?: number;
}
