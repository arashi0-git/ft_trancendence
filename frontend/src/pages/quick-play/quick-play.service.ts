import { BaseGameService } from "../../shared/services/base-game.service";
import { router } from "../../routes/router";
import type { PlayerOption } from "../../shared/types/tournament";
import { HistoryService } from "../../shared/services/history-service";
import { AuthService } from "../../shared/services/auth-service";

export class QuickPlayService extends BaseGameService {
  private playerSelections: (PlayerOption | null)[] = [];

  initializeGame(
    canvasId: string,
    playerCount: number,
    playerSelections: (PlayerOption | null)[],
    aiPlayers?: { [key: string]: { difficulty: "easy" | "medium" | "hard" } },
  ): void {
    this.playerSelections = playerSelections;

    // プレイヤー名を抽出
    const playerNames = {
      player1: playerSelections[0]?.displayName,
      player2: playerSelections[1]?.displayName,
      player3: playerSelections[2]?.displayName,
      player4: playerSelections[3]?.displayName,
    };

    this.gameManager.initializeGame({
      mode: "quick-play",
      canvasId: canvasId,
      playerCount: playerCount,
      playerNames: playerNames,
      aiPlayers: aiPlayers,
      onGameEnd: (data: { winner: number; score1: number; score2: number }) =>
        this.handleGameEnd(data),
    });
  }

  attachGameControls(): void {
    this.addControlListener("start-game", "click", (event) => {
      event.stopPropagation();
      this.startGame();
    });
    this.addControlListener("pause-game", "click", (event) => {
      event.stopPropagation();
      this.pauseGame();
    });
    this.addControlListener("reset-game", "click", (event) => {
      event.stopPropagation();
      this.resetGame();
    });
    this.addControlListener("reset-game-modal-btn", "click", (event) => {
      event.stopPropagation();
      this.resetGame();
    });
  }

  protected onGameStart(): void {
    // Quick-play specific logic if needed
  }

  protected onGamePause(): void {
    // Quick-play specific logic if needed
  }

  protected onGameReset(): void {
    const modal = document.getElementById("game-over-modal");
    modal?.classList.add("hidden");

    const startBtn = this.getStartButton();
    const pauseBtn = this.getPauseButton();

    startBtn?.classList.remove("hidden");
    pauseBtn?.classList.remove("hidden");
  }

  protected getStartButton(): HTMLButtonElement | null {
    const element = document.getElementById("start-game");
    return element instanceof HTMLButtonElement ? element : null;
  }

  protected getPauseButton(): HTMLButtonElement | null {
    const element = document.getElementById("pause-game");
    return element instanceof HTMLButtonElement ? element : null;
  }

  private async handleGameEnd(data: {
    winner: number;
    score1: number;
    score2: number;
  }): Promise<void> {
    // Save game history for logged-in users
    await this.saveGameHistory(data);

    const modal = document.getElementById("game-over-modal");
    const winnerNameEl = document.getElementById("winner-name");
    const finalScoreEl = document.getElementById("final-score");
    const startBtn = this.getStartButton();
    const pauseBtn = this.getPauseButton();

    if (modal && winnerNameEl && finalScoreEl) {
      winnerNameEl.textContent = this.getWinnerDisplayName(data.winner);
      finalScoreEl.textContent = `${data.score1} - ${data.score2}`;
      modal.classList.remove("hidden");

      startBtn?.classList.add("hidden");
      pauseBtn?.classList.add("hidden");
    }
    this.updateButtonStates(false);
  }
  // this displays the winner's name based on player selections
  private getWinnerDisplayName(winner: number): string {
    const formatName = (selection: PlayerOption | null, index: number) => {
      if (!selection) {
        return `Player ${index + 1}`;
      }
      if (selection.displayName?.trim()) {
        return selection.displayName.trim();
      }
      if (selection.isAI) {
        const difficulty = selection.aiDifficulty
          ? selection.aiDifficulty.charAt(0).toUpperCase() +
            selection.aiDifficulty.slice(1)
          : "AI";
        return `AI (${difficulty})`;
      }
      return `Player ${index + 1}`;
    };

    if (this.playerSelections.length <= 0) {
      return `Player ${winner}`;
    }

    if (this.playerSelections.length <= 2) {
      const winnerIndex = Math.max(0, Math.min(winner - 1, 1));
      return formatName(
        this.playerSelections[winnerIndex] ?? null,
        winnerIndex,
      );
    }

    const teamIndices = winner === 1 || winner === 3 ? [0, 2] : [1, 3];
    const names = teamIndices
      .map((idx) =>
        idx < this.playerSelections.length
          ? formatName(this.playerSelections[idx] ?? null, idx)
          : null,
      )
      .filter((name): name is string => !!name)
      .filter((name, idx, arr) => arr.indexOf(name) === idx);

    return names.length ? names.join(" & ") : `Player ${winner}`;
  }

  private async saveGameHistory(data: {
    winner: number;
    score1: number;
    score2: number;
  }): Promise<void> {
    // Check if user is authenticated
    if (!AuthService.isAuthenticated()) {
      return; // Guest user, don't save history
    }

    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return; // Failed to get user
    }

    // Find which player is the logged-in user
    let userPlayerIndex = -1;
    for (let i = 0; i < this.playerSelections.length; i++) {
      if (this.playerSelections[i]?.userId === currentUser.id) {
        userPlayerIndex = i;
        break;
      }
    }

    if (userPlayerIndex === -1) {
      return; // User not in this game
    }

    const playerNumber = userPlayerIndex + 1; // 1-indexed
    const userIsTeam1 = playerNumber === 1 || playerNumber === 3;
    const winnerIsTeam1 = data.winner === 1 || data.winner === 3;
    const isWinner = userIsTeam1 === winnerIsTeam1;

    // Get user's score and opponent's score
    let myScore = 0;
    let opponentScore = 0;
    if (playerNumber === 1 || playerNumber === 3) {
      myScore = data.score1; // Left team
      opponentScore = data.score2; // Right team
    } else {
      myScore = data.score2; // Right team
      opponentScore = data.score1; // Left team
    }

    // Build teammate info (for 2v2)
    let teammate: string | null = null;
    if (this.playerSelections.length === 4) {
      // Players 1 & 3 are left team, Players 2 & 4 are right team
      const teammateMap: { [key: number]: number } = {
        1: 2, // Player 1's teammate is Player 3 (index 2)
        2: 3, // Player 2's teammate is Player 4 (index 3)
        3: 0, // Player 3's teammate is Player 1 (index 0)
        4: 1, // Player 4's teammate is Player 2 (index 1)
      };
      const teammateIndex = teammateMap[playerNumber];

      const teammateSelection = this.playerSelections[teammateIndex];
      if (teammateSelection) {
        teammate = teammateSelection.displayName;
      }
    }

    // Build opponent info
    const opponents: string[] = [];
    for (let i = 0; i < this.playerSelections.length; i++) {
      const pNum = i + 1;
      // Skip user and teammate
      if (pNum === playerNumber) continue;
      if (this.playerSelections.length === 4) {
        const isTeammate =
          playerNumber === 1 || playerNumber === 3
            ? pNum === 1 || pNum === 3
            : pNum === 2 || pNum === 4;
        if (isTeammate) continue;
      }

      const opponent = this.playerSelections[i];
      if (opponent) {
        if (opponent.isAI) {
          opponents.push(`AI (${opponent.aiDifficulty || "medium"})`);
        } else {
          opponents.push(opponent.displayName);
        }
      }
    }

    const opponentInfo = opponents.join(", ") || "Unknown";

    try {
      await HistoryService.saveGame({
        userId: currentUser.id,
        tournamentId: null, // Quick play has no tournament
        teammate,
        myScore,
        opponentScore,
        isWinner,
        opponentInfo,
        finishedAt: new Date().toISOString(),
        matchType: "quick",
        tournamentRound: null,
        tournamentName: null,
      });
    } catch (error) {
      console.error("Failed to save game history:", error);
      // Don't show error to user, just log it
    }
  }

  navigateToHome(): void {
    this.navigate("/");
  }

  navigateToLogin(): void {
    this.navigate("/login");
  }

  private navigate(path: string): void {
    router.navigate(path);
  }

  navigateToGameView(): void {
    this.navigate("/quick-play/game");
  }

  navigateToRegistration(): void {
    this.navigate("/quick-play");
  }
}
