import { GameManagerService } from "../../shared/services/game-manager.service";
import { NotificationService } from "../../shared/services/notification.service";
import { AuthService } from "../../shared/services/auth-service";
import { router } from "../../routes/router";

export class QuickPlayService {
  private gameManager: GameManagerService;
  private notificationService: NotificationService;
  private controlListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

  constructor() {
    this.gameManager = new GameManagerService();
    this.notificationService = NotificationService.getInstance();
  }

  initializeGame(canvasId: string): void {
    this.gameManager.initializeGame({
      mode: "quick-play",
      canvasId,
      onGameEnd: (winner: number) => this.handleGameEnd(winner),
    });
  }

  attachGameControls(): void {
    const startBtn = document.getElementById("start-game");
    const pauseBtn = document.getElementById("pause-game");
    const resetBtn = document.getElementById("reset-game");

    if (startBtn && pauseBtn && resetBtn) {
      const startHandler = () =>
        this.startGame(
          startBtn as HTMLButtonElement,
          pauseBtn as HTMLButtonElement,
        );
      const pauseHandler = () =>
        this.pauseGame(
          startBtn as HTMLButtonElement,
          pauseBtn as HTMLButtonElement,
        );
      const resetHandler = () =>
        this.resetGame(
          startBtn as HTMLButtonElement,
          pauseBtn as HTMLButtonElement,
        );

      startBtn.addEventListener("click", startHandler);
      pauseBtn.addEventListener("click", pauseHandler);
      resetBtn.addEventListener("click", resetHandler);

      this.controlListeners.push(
        { element: startBtn, event: "click", handler: startHandler },
        { element: pauseBtn, event: "click", handler: pauseHandler },
        { element: resetBtn, event: "click", handler: resetHandler },
      );
    }
  }

  private startGame(
    startBtn: HTMLButtonElement,
    pauseBtn: HTMLButtonElement,
  ): void {
    if (!startBtn || !pauseBtn) return;
    this.gameManager.startGame();
    startBtn.disabled = true;
    pauseBtn.disabled = false;
  }

  private pauseGame(
    startBtn: HTMLButtonElement,
    pauseBtn: HTMLButtonElement,
  ): void {
    this.gameManager.pauseGame();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }

  private resetGame(
    startBtn: HTMLButtonElement,
    pauseBtn: HTMLButtonElement,
  ): void {
    this.gameManager.resetGame();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }

  private handleGameEnd(winner: number): void {
    this.notificationService.success(`Player ${winner} wins! 🎉`);
    const startBtn = document.getElementById("start-game");
    const pauseBtn = document.getElementById("pause-game");
    if (startBtn && pauseBtn) {
      (startBtn as HTMLButtonElement).disabled = false;
      (pauseBtn as HTMLButtonElement).disabled = true;
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

  cleanup(): void {
    this.controlListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.controlListeners = [];
    this.gameManager.cleanup();
  }
}
