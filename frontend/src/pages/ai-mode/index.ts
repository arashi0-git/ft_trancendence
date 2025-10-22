import { AiModeService } from "./ai-mode.service";
import { PageComponent } from "../../routes/route-config";

export class AiModePage implements PageComponent {
  private aiModeService: AiModeService;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.aiModeService = new AiModeService();
  }

  render(): void {
    this.container.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-md">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold">AI Mode - Pong vs Computer</h2>
          <div class="space-x-2">
            <button id="back-to-home" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Home</button>
          </div>
        </div>

        <div class="mb-4 flex justify-center items-center space-x-4">
          <label class="text-sm font-medium">Difficulty:</label>
          <select id="difficulty-select" class="border border-gray-300 rounded px-3 py-1">
            <option value="easy">Easy</option>
            <option value="medium" selected>Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div class="mb-4 text-center">
          <div class="space-x-4">
            <button id="start-ai-game" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded">Start Game</button>
            <button id="pause-ai-game" class="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded" disabled>Pause</button>
            <button id="reset-ai-game" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded">Reset</button>
          </div>
        </div>
        
        <div class="flex justify-center mb-4">
          <canvas id="ai-game-canvas" width="800" height="400" class="border-2 border-gray-300 bg-black"></canvas>
        </div>
        
        <div class="text-center text-sm text-gray-600">
          <p><strong>Player 1 (You):</strong> W/S (Up/Down), A/D (Left/Right)</p>
          <p><strong>Player 2 (AI):</strong> Computer controlled</p>
        </div>
      </div>
    `;

    this.initialize();
  }

  private initialize(): void {
    this.aiModeService.initializeGame("ai-game-canvas");
    this.aiModeService.attachGameControls();
    this.aiModeService.attachNavigationControls();
  }

  destroy(): void {
    this.aiModeService.cleanup();
  }
}
