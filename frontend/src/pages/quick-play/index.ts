import { QuickPlayService } from "./quick-play.service";
import { SpacePageBase } from "../../shared/components/space-page-base";

export class QuickPlayPage extends SpacePageBase {
  private service: QuickPlayService;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new QuickPlayService();
  }

  render(): void {
    this.container.innerHTML = this.getTemplate();
    this.attachEventListeners();
    this.service.initializeGame("pong-canvas");
    this.initializeSpaceBackground();
  }

  private getTemplate(): string {
    const authButton = this.service.getAuthButtonTemplate();

    const content = `
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-white">Quick Play - Pong</h2>
          <div class="space-x-2">
            ${authButton}
            <button id="back-to-home" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded border border-purple-400">Home</button>
          </div>
        </div>

        <div class="mb-4 text-center">
          <div class="space-x-4">
            <button id="start-game" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded border border-green-400 shadow-lg">Start Game</button>
            <button id="pause-game" class="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded border border-yellow-400 shadow-lg" disabled>Pause</button>
            <button id="reset-game" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded border border-blue-400 shadow-lg">Reset</button>
          </div>
        </div>
        
        <div class="flex justify-center mb-4">
          <canvas id="pong-canvas" class="border-2 border-gray-300 bg-black"></canvas>
        </div>
        
        <div class="text-center text-sm text-gray-300">
          <p><strong class="text-white">Player 1:</strong> W/S (Up/Down), A/D (Left/Right)</p>
          <p><strong class="text-white">Player 2:</strong> ↑/↓ (Up/Down), ←/→ (Left/Right)</p>
        </div>
    `;

    return this.getSpaceTemplate(content);
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
    this.cleanupSpaceBackground();
  }
}
