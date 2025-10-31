import { GameSettingsService } from "./game-settings.service";
import { SpacePageBase } from "../../shared/components/space-page-base";

export class GameSettingsPage extends SpacePageBase {
  private service: GameSettingsService;
  private unsubscribeSettings?: () => void;

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
    const fieldColor = this.service.getFieldColor();
    const ballColor = this.service.getBallColor();
    const paddleColor = this.service.getPaddleColor();
    const paddleLength = this.service.getPaddleLength();
    const ballSize = this.service.getBallSize();
    const isDefault = this.service.isUsingDefaults();
    const content = `
      <div class="text-white text-center max-w-md mx-auto">
        <h2 class="text-2xl font-bold mb-4">Game Customization</h2>
        <p class="mb-6 text-gray-300">
          Changes made here will apply to all game modes
        </p>

        <div class="space-y-4">
          <div class="flex justify-between items-center bg-black bg-opacity-20 p-4 rounded-lg">
            <label for="power-ups-toggle" class="text-lg">Default</label>
            <input type="checkbox" id="power-ups-toggle" class="form-checkbox h-6 w-6 text-yellow-500 rounded focus:ring-yellow-400" ${isDefault ? "checked" : ""}>
          </div>

          <div class="flex justify-between items-center bg-black bg-opacity-20 p-4 rounded-lg">
            <label for="field-color-picker" class="text-lg">Background color</label>
            <input type="color" id="field-color-picker" value="${fieldColor}" class="w-12 h-10 p-0 border-0 rounded">
          </div>

          <div class="flex justify-between items-center bg-black bg-opacity-20 p-4 rounded-lg">
            <label for="ball-color-picker" class="text-lg">Ball color</label>
            <input type="color" id="ball-color-picker" value="${ballColor}" class="w-12 h-10 p-0 border-0 rounded">
          </div>

          <div class="flex justify-between items-center bg-black bg-opacity-20 p-4 rounded-lg">
            <label for="paddle-color-picker" class="text-lg">Paddle color</label>
            <input type="color" id="paddle-color-picker" value="${paddleColor}" class="w-12 h-10 p-0 border-0 rounded">
          </div>

          <div class="bg-black bg-opacity-20 p-4 rounded-lg text-left">
            <span class="text-lg block mb-3">Paddle length</span>
            <div class="flex justify-around">
              <label class="flex items-center space-x-2">
                <input type="radio" name="paddle-length" value="short" class="form-radio text-purple-500" ${paddleLength === "short" ? "checked" : ""}>
                <span>Short</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="radio" name="paddle-length" value="normal" class="form-radio text-purple-500" ${paddleLength === "normal" ? "checked" : ""}>
                <span>Normal</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="radio" name="paddle-length" value="long" class="form-radio text-purple-500" ${paddleLength === "long" ? "checked" : ""}>
                <span>Long</span>
              </label>
            </div>
          </div>

          <div class="bg-black bg-opacity-20 p-4 rounded-lg text-left">
            <span class="text-lg block mb-3">Ball size</span>
            <div class="flex justify-around">
              <label class="flex items-center space-x-2">
                <input type="radio" name="ball-size" value="small" class="form-radio text-purple-500" ${ballSize === "small" ? "checked" : ""}>
                <span>Small</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="radio" name="ball-size" value="normal" class="form-radio text-purple-500" ${ballSize === "normal" ? "checked" : ""}>
                <span>Normal</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="radio" name="ball-size" value="big" class="form-radio text-purple-500" ${ballSize === "big" ? "checked" : ""}>
                <span>Big</span>
              </label>
            </div>
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
    const fieldColorPicker = document.getElementById(
      "field-color-picker",
    ) as HTMLInputElement | null;
    const ballColorPicker = document.getElementById(
      "ball-color-picker",
    ) as HTMLInputElement | null;
    const paddleColorPicker = document.getElementById(
      "paddle-color-picker",
    ) as HTMLInputElement | null;
    const defaultToggle = document.getElementById(
      "power-ups-toggle",
    ) as HTMLInputElement | null;
    const paddleLengthInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>("input[name='paddle-length']"),
    );
    const ballSizeInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>("input[name='ball-size']"),
    );

    if (fieldColorPicker) {
      fieldColorPicker.addEventListener("input", (event) => {
        const target = event.target as HTMLInputElement;
        this.service.updateFieldColor(target.value);
      });
    }

    if (ballColorPicker) {
      ballColorPicker.addEventListener("input", (event) => {
        const target = event.target as HTMLInputElement;
        this.service.updateBallColor(target.value);
      });
    }

    if (paddleColorPicker) {
      paddleColorPicker.addEventListener("input", (event) => {
        const target = event.target as HTMLInputElement;
        this.service.updatePaddleColor(target.value);
      });
    }

    if (defaultToggle) {
      defaultToggle.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
          this.service.resetToDefaults();
        }
        target.checked = this.service.isUsingDefaults();
      });
    }

    paddleLengthInputs.forEach((input) => {
      input.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
          const value = target.value;
          if (value === "short" || value === "normal" || value === "long") {
            this.service.updatePaddleLength(value);
          }
        }
      });
    });

    ballSizeInputs.forEach((input) => {
      input.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
          const value = target.value;
          if (value === "small" || value === "normal" || value === "big") {
            this.service.updateBallSize(value);
          }
        }
      });
    });

    this.unsubscribeSettings = this.service.subscribeToSettings((settings) => {
      if (fieldColorPicker && fieldColorPicker.value !== settings.fieldColor) {
        fieldColorPicker.value = settings.fieldColor;
      }
      if (ballColorPicker && ballColorPicker.value !== settings.ballColor) {
        ballColorPicker.value = settings.ballColor;
      }
      if (
        paddleColorPicker &&
        paddleColorPicker.value !== settings.paddleColor
      ) {
        paddleColorPicker.value = settings.paddleColor;
      }
      paddleLengthInputs.forEach((input) => {
        input.checked = input.value === settings.paddleLength;
      });
      ballSizeInputs.forEach((input) => {
        input.checked = input.value === settings.ballSize;
      });
      if (defaultToggle) {
        defaultToggle.checked = this.service.isUsingDefaults();
      }
    });

    document.getElementById("back-to-home")?.addEventListener("click", () => {
      this.service.navigateToHome();
    });
  }

  destroy(): void {
    this.unsubscribeSettings?.();
    this.unsubscribeSettings = undefined;
    this.cleanupSpaceBackground();
  }
}
