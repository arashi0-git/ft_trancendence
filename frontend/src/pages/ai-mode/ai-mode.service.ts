import { BaseAiGameService } from "../../shared/services/base-ai-game.service";
import { router } from "../../routes/router";
import { AiPlayer, type AiDifficulty } from "./ai-player";

export class AiModeService extends BaseAiGameService {
  initializeGame(canvasId: string): void {
    try {
      this.gameManager.initializeGame({
        mode: "ai-mode",
        canvasId,
        onGameEnd: (data: any) => this.handleGameEnd(data),
      });

      if (this.aiPlayer) {
        this.aiPlayer.stop();
      }
      this.aiPlayer = new AiPlayer(this.currentDifficulty);
    } catch (error) {
      this.notificationService.error("AI-modeの初期化に失敗しました");
      console.error("Failed to initialize AI mode:", error);
      throw error;
    }
  }
  attachGameControls(): void {
    this.addControlListener("start-ai-game", "click", () => this.startGame());
    this.addControlListener("pause-ai-game", "click", () => this.pauseGame());
    this.addControlListener("reset-ai-game", "click", () => this.resetGame());
    this.addControlListener("difficulty-select", "change", (e) => {
      const target = e.target as HTMLSelectElement;
      const value = target.value;
      if (value === "easy" || value === "medium" || value === "hard") {
        this.changeDifficulty(value as AiDifficulty);
      }
    });
    this.addControlListener("reset-game-modal-btn", "click", () =>
      this.resetGame(),
    );
  }
  attachNavigationControls(): void {
    this.addControlListener("back-to-home", "click", () =>
      this.navigateToHome(),
    );
  }

  protected getStartButton(): HTMLButtonElement | null {
    const element = document.getElementById("start-ai-game");
    return element instanceof HTMLButtonElement ? element : null;
  }

  protected getPauseButton(): HTMLButtonElement | null {
    const element = document.getElementById("pause-ai-game");
    return element instanceof HTMLButtonElement ? element : null;
  }

  protected onGameReset(): void {
    const modal = document.getElementById("game-over-modal");
    modal?.classList.add("hidden");

    const startBtn = this.getStartButton();
    const pauseBtn = this.getPauseButton();

    startBtn?.classList.remove("hidden");
    pauseBtn?.classList.remove("hidden");
  }

  private handleGameEnd(data: any): void {
    const modal = document.getElementById("game-over-modal");
    const winnerNameEl = document.getElementById("winner-name");
    const finalScoreEl = document.getElementById("final-score");
    const startBtn = this.getStartButton();
    const pauseBtn = this.getPauseButton();

    if (modal && winnerNameEl && finalScoreEl) {
      winnerNameEl.textContent = `Player ${data.winner}`;
      finalScoreEl.textContent = `${data.score1} - ${data.score2}`;
      startBtn?.classList.add("hidden");
      pauseBtn?.classList.add("hidden");
      modal.classList.remove("hidden");
    } else {
      this.notificationService.success(`Player ${data.winner} wins! 🎉`);
    }
    this.updateButtonStates(false);
  }

  navigateToHome(): void {
    this.cleanup();
    router.navigate("/");
  }
}
