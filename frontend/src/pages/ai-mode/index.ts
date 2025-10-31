import { AiModeService } from "./ai-mode.service";
import { PageComponent } from "../../routes/route-config";
import { SpacePageBase } from "../../shared/components/space-page-base";

export class AiModePage extends SpacePageBase implements PageComponent {
  private aiModeService: AiModeService;

  constructor(container: HTMLElement) {
    super(container);
    this.aiModeService = new AiModeService();
  }

  render(): void {
    const content = `
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-white">AI Mode - Pong vs Computer</h2>
          <div class="space-x-2">
            <button id="back-to-home" class="bg-purple-400 hover:bg-purple-600 text-white px-4 py-2 rounded border border-purple-400">Home</button>
          </div>
        </div>

        <div class="mb-4 flex justify-center items-center space-x-4">
          <label class="text-sm font-medium text-white">Difficulty:</label>
          <select id="difficulty-select" class="border border-gray-300 rounded px-3 py-1">
            <option value="easy">Easy</option>
            <option value="medium" selected>Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div class="mb-4 text-center">
          <div class="space-x-4">
            <button id="start-ai-game" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded border border-green-400 shadow-lg">Start Game</button>
            <button id="pause-ai-game" class="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded border border-yellow-400 shadow-lg" disabled>Pause</button>
            <button id="reset-ai-game" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded border border-blue-400 shadow-lg">Reset</button>
          </div>
        </div>
        
        <div class="flex justify-center mb-4">
          <canvas id="ai-game-canvas" width="800" height="400" class="border-2 border-gray-300 bg-black"></canvas>
        </div>
        
        <div class="text-center text-sm text-gray-300">
          <p><strong class="text-white">Player 1 (You):</strong> W/S (Up/Down) </p>
          <p><strong class="text-white">Player 2 (AI):</strong> Computer controlled</p>
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

    this.container.innerHTML = this.getSpaceTemplate(content);
    this.initializeAppHeader();
    this.initialize();
    this.initializeSpaceBackground();
  }

  private initialize(): void {
    try {
      const canvas = document.getElementById("ai-game-canvas");
      if (!canvas) {
        throw new Error("Canvas element not found");
      }
      this.aiModeService.initializeGame("ai-game-canvas");
      this.aiModeService.attachGameControls();
      this.aiModeService.attachNavigationControls();
    } catch (error) {
      console.error("Failed to initialize AI mode:", error);
      this.container.innerHTML = `
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Failed to initialize game. Please try again.</p>
        </div>
      `;
    }
  }

  destroy(): void {
    this.aiModeService.cleanup();
    this.cleanupSpaceBackground();
    this.cleanupAppHeader();
  }
}
