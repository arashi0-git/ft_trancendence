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
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-xl font-bold text-white">Quick Play - Pong</h2>
          <div class="space-x-2">
            ${authButton}
            <button id="back-to-home" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 text-sm rounded border border-purple-400">Home</button>
          </div>
        </div>

        <div class="mb-3 text-center">
          <div class="space-x-3">
            <button id="start-game" class="bg-green-600 hover:bg-green-700 text-white px-4 py-1 text-sm rounded border border-green-400 shadow-lg">Start Game</button>
            <button id="pause-game" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-1 text-sm rounded border border-yellow-400 shadow-lg" disabled>Pause</button>
            <button id="reset-game" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 text-sm rounded border border-blue-400 shadow-lg">Reset</button>
          </div>
        </div>
        
        <div class="flex justify-center mb-3">
          <canvas id="pong-canvas" class="border-2 border-gray-300 bg-black max-w-full h-auto"></canvas>
        </div>
        
        <div class="text-center text-xs text-gray-300">
          <p><strong class="text-white">Player 1:</strong> W/S (Up/Down), A/D (Left/Right) | <strong class="text-white">Player 2:</strong> ↑/↓ (Up/Down), ←/→ (Left/Right)</p>
        </div>

        <div id="game-over-modal" class="hidden absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-75 z-50">
          
          <div class="bg-white p-8 rounded-lg shadow-xl text-center text-black">
            
            <h2 class="text-3xl font-bold mb-4">Game finished!</h2>
            
            <p class="text-xl mb-2">Winner: <span id="winner-name" class="font-semibold"></span></p>
            
            <p class="text-lg mb-6">Final Score: <span id="final-score" class="font-semibold"></span></p>
            
            <button id="reset-game-modal-btn" class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded">
              Reset Game
            </button>
          </div>
        
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
