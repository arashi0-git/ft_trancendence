import { BaseGameService } from "../../shared/services/base-game.service";
import { AuthService } from "../../shared/services/auth-service";
import { router } from "../../routes/router";

export class QuickPlayService extends BaseGameService {
  initializeGame(canvasId: string): void {
    this.gameManager.initializeGame({
      mode: "quick-play",
      canvasId,
      onGameEnd: (winner: number) => this.handleGameEnd(winner),
    });
  }

  attachGameControls(): void {
    this.addControlListener("start-game", "click", () => this.startGame());
    this.addControlListener("pause-game", "click", () => this.pauseGame());
    this.addControlListener("reset-game", "click", () => this.resetGame());
  }

  protected onGameStart(): void {
    // Quick-play specific logic if needed
  }

  protected onGamePause(): void {
    // Quick-play specific logic if needed
  }

  protected onGameReset(): void {
    // Quick-play specific logic if needed
  }

  protected getStartButton(): HTMLButtonElement | null {
    const element = document.getElementById("start-game");
    return element instanceof HTMLButtonElement ? element : null;
  }

  protected getPauseButton(): HTMLButtonElement | null {
    const element = document.getElementById("pause-game");
    return element instanceof HTMLButtonElement ? element : null;
  }

  private handleGameEnd(winner: number): void {
    this.notificationService.success(`Player ${winner} wins! 🎉`);
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
