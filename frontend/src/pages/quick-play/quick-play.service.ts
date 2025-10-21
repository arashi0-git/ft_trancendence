import { GameManagerService } from "../../shared/services/game-manager.service";
import { AuthService } from "../../shared/services/auth-service";

export class QuickPlayService {
  private gameManager: GameManagerService;

  constructor() {
    this.gameManager = new GameManagerService();
  }

  initializeGame(canvasId: string): void {
    this.gameManager.initializeGame({
      mode: "quick-play",
      canvasId,
      onGameEnd: (winner: number) => this.handleGameEnd(winner),
    });
  }

  attachGameControls(): void {
    const startBtn = document.getElementById("start-game") as HTMLButtonElement;
    const pauseBtn = document.getElementById("pause-game") as HTMLButtonElement;
    const resetBtn = document.getElementById("reset-game") as HTMLButtonElement;

    startBtn?.addEventListener("click", () => {
      this.startGame(startBtn, pauseBtn);
    });

    pauseBtn?.addEventListener("click", () => {
      this.pauseGame(startBtn, pauseBtn);
    });

    resetBtn?.addEventListener("click", () => {
      this.resetGame(startBtn, pauseBtn);
    });
  }

  private startGame(
    startBtn: HTMLButtonElement,
    pauseBtn: HTMLButtonElement,
  ): void {
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
    alert(`Player ${winner} wins!`);
    const startBtn = document.getElementById("start-game") as HTMLButtonElement;
    const pauseBtn = document.getElementById("pause-game") as HTMLButtonElement;
    if (startBtn && pauseBtn) {
      startBtn.disabled = false;
      pauseBtn.disabled = true;
    }
  }

  navigateToHome(): void {
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  navigateToLogin(): void {
    window.history.pushState(null, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  async handleLogout(): Promise<void> {
    await AuthService.logout();
    this.navigateToHome();
  }

  getAuthButtonTemplate(): string {
    return AuthService.isAuthenticated()
      ? `<button id="logout-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Logout</button>`
      : `<button id="login-quick-btn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Login</button>`;
  }

  cleanup(): void {
    this.gameManager.cleanup();
  }
}
