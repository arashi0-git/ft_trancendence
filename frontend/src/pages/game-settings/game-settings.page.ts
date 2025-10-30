import { GameSettingsService } from "./game-settings.service";
import { SpacePageBase } from "../../shared/components/space-page-base";

export class GameSettingsPage extends SpacePageBase {
  private service: GameSettingsService;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new GameSettingsService();
  }

  render(): void {
    this.container.innerHTML = this.getTemplate();
    this.attachEventListeners();
    this.initializeSpaceBackground();
  }

  private getTemplate(): string {
    const content = `
      <div class="text-white text-center max-w-md mx-auto">
        <h2 class="text-2xl font-bold mb-4">Game Customization</h2>
        <p class="mb-6 text-gray-300">
          Changes made here will apply to all game modes
        </p>

        <div class="space-y-4">
          <div class="flex justify-between items-center bg-black bg-opacity-20 p-4 rounded-lg">
            <label for="power-ups-toggle" class="text-lg">Something here</label>
            <input type="checkbox" id="power-ups-toggle" class="form-checkbox h-6 w-6 text-yellow-500 rounded focus:ring-yellow-400">
          </div>

          <div class="flex justify-between items-center bg-black bg-opacity-20 p-4 rounded-lg">
            <label for="field-color-picker" class="text-lg">Background color</label>
            <input type="color" id="field-color-picker" value="#374151" class="w-12 h-10 p-0 border-0 rounded">
          </div>
        </div>

        <button id="back-to-home" class="mt-8 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded border border-purple-400">
          Home
        </button>
      </div>
    `;
    return this.getSpaceTemplate(content);
  }

  private attachEventListeners(): void {
    document.getElementById("back-to-home")?.addEventListener("click", () => {
      this.service.navigateToHome();
    });

    document
      .getElementById("power-ups-toggle")
      ?.addEventListener("change", (e) => {
        const isEnabled = (e.target as HTMLInputElement).checked;
        console.log("Power-ups:", isEnabled);
      });
  }

  destroy(): void {
    this.cleanupSpaceBackground();
  }
}
