import { QuickPlayService } from "./quick-play.service";

export class QuickPlayPage {
  private service: QuickPlayService;

  constructor(private container: HTMLElement) {
    this.service = new QuickPlayService();
  }

  render(): void {
    this.container.innerHTML = this.getTemplate();
    this.attachEventListeners();
    this.service.initializeGame("pong-canvas");
  }

  private getTemplate(): string {
    const authButton = this.service.getAuthButtonTemplate();

    return `
      <div class="bg-white p-6 rounded-lg shadow-md">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold">Quick Play - Pong</h2>
          <div class="space-x-2">
            ${authButton}
            <button id="back-to-home" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Home</button>
          </div>
        </div>

        <div class="mb-4 text-center">
          <div class="space-x-4">
            <button id="start-game" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded">Start Game</button>
            <button id="pause-game" class="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded" disabled>Pause</button>
            <button id="reset-game" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded">Reset</button>
          </div>
        </div>
        
        <div class="flex justify-center mb-4">
          <canvas id="pong-canvas" class="border-2 border-gray-300 bg-black"></canvas>
        </div>
        
        <div class="text-center text-sm text-gray-600">
          <p><strong>Player 1:</strong> W/S (Up/Down), A/D (Left/Right)</p>
          <p><strong>Player 2:</strong> ↑/↓ (Up/Down), ←/→ (Left/Right)</p>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    document.getElementById("back-to-home")?.addEventListener("click", () => {
      this.service.navigateToHome();
    });

    document
      .getElementById("login-quick-btn")
      ?.addEventListener("click", () => {
        this.service.navigateToLogin();
      });

    document
      .getElementById("logout-btn")
      ?.addEventListener("click", async () => {
        try {
          await this.service.handleLogout();
        } catch (error) {
          console.error("Logout handler error:", error);
        }
      });

    // ゲームコントロール
    this.service.attachGameControls();
  }

  destroy(): void {
    this.service.cleanup();
  }
}
