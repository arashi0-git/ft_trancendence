import { BaseGameService } from "../../shared/services/base-game.service";
import { AuthService } from "../../shared/services/auth-service";
import { router } from "../../routes/router";

export class QuickPlayService extends BaseGameService {
  initializeGame(canvasId: string): void {
    this.gameManager.initializeGame({
      mode: "quick-play",
      canvasId,
      onGameEnd: (data: any) => this.handleGameEnd(data),
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
    this.navigate("/");
  }

  navigateToLogin(): void {
    this.navigate("/login");
  }

  private navigate(path: string): void {
    router.navigate(path);
  }

  // 認証関連のメソッドは共通ヘッダーに移動したため削除

  // cleanup()はBaseGameServiceから継承
}
