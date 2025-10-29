import { BaseGameService } from "../../shared/services/base-game.service";
import { AuthService } from "../../shared/services/auth-service";
import { router } from "../../routes/router";

export class QuickPlayService extends BaseGameService {
  initializeGame(canvasId: string, playerCount: number): void {
    this.gameManager.initializeGame({
      mode: "quick-play",
      canvasId,
      onGameEnd: (data: any) => this.handleGameEnd(data),
    });
  }

  attachGameControls(): void {
    this.addControlListener("start-game", "click", () => this.startGame());
    this.addControlListener("pause-game", "click", () => this.pauseGame());
    this.addControlListener("reset-game", "click", () => this.resetGame());
    this.addControlListener("reset-game-modal-btn", "click", () =>
      this.resetGame(),
    );
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
      modal.classList.remove("hidden");
      if (startBtn) startBtn.style.display = 'none';
      if (pauseBtn) pauseBtn.style.display = 'none';
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

  async handleLogout(): Promise<void> {
    try {
      await AuthService.logout();
      this.notificationService.success("ログアウトしました");
      this.navigateToHome();
    } catch (error) {
      console.error("ログアウトに失敗しました:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "ログアウト処理でエラーが発生しました";
      this.notificationService.error(`ログアウトエラー: ${errorMessage}`);

      // エラーが発生してもホームに戻る（ローカルトークンは既に削除済み）
      this.navigateToHome();
    }
  }

  getAuthButtonTemplate(): string {
    return AuthService.isAuthenticated()
      ? `<button id="logout-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Logout</button>`
      : `<button id="login-quick-btn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Login</button>`;
  }

  // cleanup()はBaseGameServiceから継承
}
