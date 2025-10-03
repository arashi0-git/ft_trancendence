export interface Tournament {
  id: string;
  name: string;
  players: TournamentPlayer[];
  matches: Match[];
  status: "registration" | "in_progress" | "completed";
  maxPlayers: number;
  currentRound: number;
  winner?: TournamentPlayer;
  createdAt: string;
}

export interface TournamentPlayer {
  id: string;
  alias: string;
  userId?: number;
  isEliminated: boolean;
  wins: number;
  losses: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  player1: TournamentPlayer;
  player2: TournamentPlayer;
  winner?: TournamentPlayer;
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
