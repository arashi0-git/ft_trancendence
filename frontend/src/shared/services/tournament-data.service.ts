import type { PlayerOption } from "../types/tournament";

export interface TournamentPlayer {
  id: string;
  alias: string;
  wins: number;
  losses: number;
  isAI: boolean;
  aiDifficulty?: "easy" | "medium" | "hard";
  userId?: number;
}

export interface TournamentMatch {
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  score?: { player1: number; player2: number };
  status: "pending" | "in_progress" | "completed";
  round: number;
}

export interface TournamentData {
  id: string;
  name: string;
  playerCount: number;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentRound: number;
  status: "setup" | "registration" | "in_progress" | "completed";
}

export class TournamentDataService {
  private static instance: TournamentDataService;
  private currentTournament: TournamentData | null = null;

  static getInstance(): TournamentDataService {
    if (!TournamentDataService.instance) {
      TournamentDataService.instance = new TournamentDataService();
    }
    return TournamentDataService.instance;
  }

  createTournament(name: string, playerCount: number): TournamentData {
    this.currentTournament = {
      id: crypto.randomUUID(),
      name: name || "Pong Tournament",
      playerCount,
      players: [],
      matches: [],
      currentRound: 1,
      status: "setup",
    };
    return this.currentTournament;
  }

  addPlayer(alias: string): void {
    if (!this.currentTournament) return;

    const player: TournamentPlayer = {
      id: crypto.randomUUID(),
      alias: alias.trim(),
      wins: 0,
      losses: 0,
      isAI: false,
    };

    this.currentTournament.players.push(player);
  }

  addPlayerFromSelection(playerOption: PlayerOption): void {
    if (!this.currentTournament) return;

    const player: TournamentPlayer = {
      id: crypto.randomUUID(),
      alias: playerOption.displayName,
      wins: 0,
      losses: 0,
      isAI: playerOption.isAI,
      aiDifficulty: playerOption.aiDifficulty,
      userId: playerOption.userId,
    };

    this.currentTournament.players.push(player);
  }

  generateMatches(): void {
    if (!this.currentTournament) return;

    const players = [...this.currentTournament.players];

    // 最低2人のプレイヤーが必要
    if (players.length < 2) {
      throw new Error(
        "トーナメントを開始するには最低2人のプレイヤーが必要です",
      );
    }

    // 既にマッチが存在する場合は生成しない
    if (this.currentTournament.matches.length > 0) {
      throw new Error("マッチは既に生成されています");
    }

    for (let i = 0; i < players.length; i += 2) {
      const first = players[i];
      const second = players[i + 1];
      if (first && second) {
        const match: TournamentMatch = {
          id: `round-1-match-${i / 2 + 1}`,
          player1Id: first.id,
          player2Id: second.id,
          status: "pending",
          round: 1,
        };
        this.currentTournament.matches.push(match);
      }
    }

    this.currentTournament.status = "in_progress";
  }

  getMatch(matchId: string): TournamentMatch | null {
    if (!this.currentTournament) return null;
    return this.currentTournament.matches.find((m) => m.id === matchId) || null;
  }

  getPlayer(playerId: string): TournamentPlayer | null {
    if (!this.currentTournament) return null;
    return (
      this.currentTournament.players.find((p) => p.id === playerId) || null
    );
  }

  completeMatch(
    matchId: string,
    winnerId: string,
    score: { player1: number; player2: number },
  ): void {
    if (!this.currentTournament) return;

    const match = this.getMatch(matchId);
    if (!match) return;

    // 勝者がマッチの参加者であることを検証
    if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
      throw new Error("勝者IDはマッチの参加者である必要があります");
    }

    // スコアの検証
    const winnerScore =
      winnerId === match.player1Id ? score.player1 : score.player2;
    const loserScore =
      winnerId === match.player1Id ? score.player2 : score.player1;
    if (winnerScore <= loserScore) {
      throw new Error("勝者のスコアは敗者のスコアより高い必要があります");
    }

    match.winnerId = winnerId;
    match.score = score;
    match.status = "completed";

    // プレイヤーの勝敗記録を更新
    const winner = this.getPlayer(winnerId);
    const loserId =
      winnerId === match.player1Id ? match.player2Id : match.player1Id;
    const loser = this.getPlayer(loserId);

    if (winner) winner.wins++;
    if (loser) loser.losses++;
  }

  getCurrentTournament(): TournamentData | null {
    return this.currentTournament;
  }

  clearTournament(): void {
    this.currentTournament = null;
  }

  isCurrentRoundCompleted(): boolean {
    if (!this.currentTournament) return false;
    const currentRoundMatches = this.getCurrentRoundMatches();
    return (
      currentRoundMatches.length > 0 &&
      currentRoundMatches.every((m) => m.status === "completed")
    );
  }

  getCurrentRoundMatches(): TournamentMatch[] {
    if (!this.currentTournament) return [];
    return this.currentTournament.matches.filter(
      (m) => m.round === this.currentTournament!.currentRound,
    );
  }

  canAdvanceToNextRound(): boolean {
    if (!this.currentTournament) return false;
    const currentRoundMatches = this.getCurrentRoundMatches();
    return currentRoundMatches.length > 1 && this.isCurrentRoundCompleted();
  }

  isTournamentComplete(): boolean {
    if (!this.currentTournament) return false;
    const currentRoundMatches = this.getCurrentRoundMatches();
    return currentRoundMatches.length === 1 && this.isCurrentRoundCompleted();
  }

  generateNextRound(): boolean {
    if (!this.currentTournament || !this.canAdvanceToNextRound()) return false;

    const currentRoundMatches = this.getCurrentRoundMatches();
    const winners: string[] = [];

    // 現在のラウンドの勝者を収集
    currentRoundMatches.forEach((match) => {
      if (match.winnerId) {
        winners.push(match.winnerId);
      }
    });

    if (winners.length < 2) return false;

    // 次のラウンドを作成
    this.currentTournament.currentRound++;
    let matchCounter = 1;

    for (let i = 0; i < winners.length; i += 2) {
      const player1Id = winners[i];
      const player2Id = winners[i + 1];
      if (player1Id && player2Id) {
        const nextMatch: TournamentMatch = {
          id: `round-${this.currentTournament.currentRound}-match-${matchCounter}`,
          player1Id,
          player2Id,
          status: "pending",
          round: this.currentTournament.currentRound,
        };
        this.currentTournament.matches.push(nextMatch);
        matchCounter++;
      }
    }

    return true;
  }

  getTournamentWinner(): TournamentPlayer | null {
    if (!this.currentTournament || !this.isTournamentComplete()) return null;

    const finalMatch = this.getCurrentRoundMatches()[0];
    if (finalMatch && finalMatch.winnerId) {
      return this.getPlayer(finalMatch.winnerId);
    }

    return null;
  }
}
