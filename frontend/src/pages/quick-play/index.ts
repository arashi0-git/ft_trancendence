import { QuickPlayService } from "./quick-play.service";
import { SpacePageBase } from "../../shared/components/space-page-base";
import { GameSetupUI } from "../../shared/components/game-setup-ui";

export class QuickPlayPage extends SpacePageBase {
  private service: QuickPlayService;
  private gameSetupUI: GameSetupUI;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new QuickPlayService();
    this.gameSetupUI = new GameSetupUI();
  }

  render(): void {
    this.container.innerHTML = this.getTemplate();
    this.renderSelectionView();
    this.initializeSpaceBackground();
  }

  private renderGameView(playerCount: number): void {
    const gameContent = `
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-white">Quick Play - Pong</h2>
          <div class="space-x-2">
            ${this.service.getAuthButtonTemplate()}
            <button id="back-to-selection" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded border border-gray-400">Back to Selection</button>
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
          <p><strong class="text-white">Player 2:</strong> X/C (Up/Down)</p>
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
    this.container.innerHTML = this.getSpaceTemplate(gameContent);
    this.attachGameEventListeners();
    this.service.initializeGame("pong-canvas", playerCount);
  }

  private renderSelectionView(): void {
    const selectionContent = this.gameSetupUI.getTemplate({
      showNameInput: false,
      selectId: "player-count-select",
      selectLabel: "Number of Players",
      options: [
        { value: "2", text: "2 Players" },
        { value: "3", text: "3 Players (Coming Soon)", disabled: true },
        { value: "4", text: "4 Players (Coming Soon)", disabled: true },
      ],
      buttonId: "start-quick-play-btn",
      buttonText: "Start Game",
    });

    const finalHtml = `
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-white">Quick Play - Select Mode</h2>
        <div class="space-x-2">
          <button id="back-to-home" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded border border-purple-400">Home</button>
        </div>
      </div>
      <div class="text-center">
        ${selectionContent}
      </div>
    `;
    this.container.innerHTML = this.getSpaceTemplate(finalHtml);
    this.attachSelectionEventListeners();
  }

  private getTemplate(): string {
    // This will just be the base template now, content is dynamic
    return this.getSpaceTemplate('<div id="quick-play-content"></div>');
  }

  private attachSelectionEventListeners(): void {
    document.getElementById("back-to-home")?.addEventListener("click", () => {
      this.service.navigateToHome();
    });

    document.getElementById("start-quick-play-btn")?.addEventListener("click", () => {
      const select = document.getElementById("player-count-select") as HTMLSelectElement;
      if (select) {
        const playerCount = parseInt(select.value, 10);
        this.renderGameView(playerCount);
      }
    });
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
  
  private attachGameEventListeners(): void {
    document.getElementById("back-to-selection")?.addEventListener("click", () => {
      this.renderSelectionView();
    });
    this.attachEventListeners(); // Attaches auth and game controls
  }

  destroy(): void {
    this.service.cleanup();
    this.cleanupSpaceBackground();
  }
}
