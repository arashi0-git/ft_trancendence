import { GameSettingsService } from "./game-settings.service";
import { SpacePageBase } from "../../shared/components/space-page-base";
import { translate } from "../../i18n";
import type {
  BallSpeedOption,
  MaxScoreOption,
} from "../../shared/services/game-customization.service";

const MAX_SCORE_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10] as const;
const BALL_SPEED_OPTIONS = ["slow", "normal", "fast"] as const;
const isMaxScoreOption = (value: number): value is MaxScoreOption =>
  MAX_SCORE_OPTIONS.includes(value as MaxScoreOption);
const isBallSpeedOption = (value: string): value is BallSpeedOption =>
  BALL_SPEED_OPTIONS.includes(value as BallSpeedOption);

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
    const ballSpeed = this.service.getBallSpeed();
    const maxScore = this.service.getMaxScore();
    const isDefault = this.service.isUsingDefaults();
    const title = translate("gameSettings.title");
    const description = translate("gameSettings.description");
    const defaultLabel = translate("gameSettings.defaultLabel");
    const fieldColorLabel = translate("gameSettings.fieldColor");
    const ballColorLabel = translate("gameSettings.ballColor");
    const paddleColorLabel = translate("gameSettings.paddleColor");
    const paddleLengthLabel = translate("gameSettings.paddleLength");
    const paddleLengthOptions = {
      short: translate("gameSettings.paddleLengthOptions.short"),
      normal: translate("gameSettings.paddleLengthOptions.normal"),
      long: translate("gameSettings.paddleLengthOptions.long"),
    };
    const ballSizeLabel = translate("gameSettings.ballSize");
    const ballSizeOptions = {
      small: translate("gameSettings.ballSizeOptions.small"),
      normal: translate("gameSettings.ballSizeOptions.normal"),
      big: translate("gameSettings.ballSizeOptions.big"),
    };
    const ballSpeedLabel = translate("gameSettings.ballSpeed");
    const pointsToWinLabel = translate("gameSettings.pointsToWin");
    const maxScoreOptions = MAX_SCORE_OPTIONS.map((option) => {
      const optionLabel = translate("gameSettings.pointsOption", {
        count: option,
      });
      return `<option value="${option}" ${option === maxScore ? "selected" : ""}>${optionLabel}</option>`;
    }).join("");
    const homeLabel = translate("navigation.home");
    const content = `
      <div class="text-white text-center max-w-md mx-auto">
        <h2 class="text-2xl font-bold mb-4">${title}</h2>
        <p class="mb-6 text-gray-300">
          ${description}
        </p>

        <div class="space-y-4">
          <div class="flex justify-between items-center bg-black bg-opacity-20 p-4 rounded-lg">
            <label for="power-ups-toggle" class="text-lg">${defaultLabel}</label>
            <input type="checkbox" id="power-ups-toggle" class="form-checkbox h-6 w-6 text-yellow-500 rounded focus:ring-yellow-400" ${isDefault ? "checked" : ""}>
          </div>

          <div class="flex justify-between items-center bg-black bg-opacity-20 p-4 rounded-lg">
            <label for="field-color-picker" class="text-lg">${fieldColorLabel}</label>
            <input type="color" id="field-color-picker" value="${fieldColor}" class="w-12 h-10 p-0 border-0 rounded">
          </div>

          <div class="flex justify-between items-center bg-black bg-opacity-20 p-4 rounded-lg">
            <label for="ball-color-picker" class="text-lg">${ballColorLabel}</label>
            <input type="color" id="ball-color-picker" value="${ballColor}" class="w-12 h-10 p-0 border-0 rounded">
          </div>

          <div class="flex justify-between items-center bg-black bg-opacity-20 p-4 rounded-lg">
            <label for="paddle-color-picker" class="text-lg">${paddleColorLabel}</label>
            <input type="color" id="paddle-color-picker" value="${paddleColor}" class="w-12 h-10 p-0 border-0 rounded">
          </div>

          <div class="bg-black bg-opacity-20 p-4 rounded-lg text-left">
            <span class="text-lg block mb-3">${paddleLengthLabel}</span>
            <div class="flex justify-around">
              <label class="flex items-center space-x-2">
                <input type="radio" name="paddle-length" value="short" class="form-radio text-purple-500" ${paddleLength === "short" ? "checked" : ""}>
                <span>${paddleLengthOptions.short}</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="radio" name="paddle-length" value="normal" class="form-radio text-purple-500" ${paddleLength === "normal" ? "checked" : ""}>
                <span>${paddleLengthOptions.normal}</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="radio" name="paddle-length" value="long" class="form-radio text-purple-500" ${paddleLength === "long" ? "checked" : ""}>
                <span>${paddleLengthOptions.long}</span>
              </label>
            </div>
          </div>

          <div class="bg-black bg-opacity-20 p-4 rounded-lg text-left">
            <span class="text-lg block mb-3">${ballSizeLabel}</span>
            <div class="flex justify-around">
              <label class="flex items-center space-x-2">
                <input type="radio" name="ball-size" value="small" class="form-radio text-purple-500" ${ballSize === "small" ? "checked" : ""}>
                <span>${ballSizeOptions.small}</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="radio" name="ball-size" value="normal" class="form-radio text-purple-500" ${ballSize === "normal" ? "checked" : ""}>
                <span>${ballSizeOptions.normal}</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="radio" name="ball-size" value="big" class="form-radio text-purple-500" ${ballSize === "big" ? "checked" : ""}>
                <span>${ballSizeOptions.big}</span>
              </label>
            </div>
          </div>

          <div class="bg-black bg-opacity-20 p-4 rounded-lg text-left">
            <span class="text-lg block mb-3">${ballSpeedLabel}</span>
            <div class="flex justify-around">
              <label class="flex items-center space-x-2">
                <input type="radio" name="ball-speed" value="slow" class="form-radio text-purple-500" ${ballSpeed === "slow" ? "checked" : ""}>
                <span>🐌</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="radio" name="ball-speed" value="normal" class="form-radio text-purple-500" ${ballSpeed === "normal" ? "checked" : ""}>
                <span>🐇</span>
              </label>
              <label class="flex items-center space-x-2">
                <input type="radio" name="ball-speed" value="fast" class="form-radio text-purple-500" ${ballSpeed === "fast" ? "checked" : ""}>
                <span>🐎</span>
              </label>
            </div>
          </div>

          <div class="bg-black bg-opacity-20 p-4 rounded-lg text-left">
            <label for="max-score-select" class="text-lg block mb-3">${pointsToWinLabel}</label>
            <select id="max-score-select" class="w-full bg-black bg-opacity-40 border border-purple-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
              ${maxScoreOptions}
            </select>
          </div>
        </div>

        <button id="back-to-home" class="mt-8 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded border border-purple-400">
          ${homeLabel}
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
      document.querySelectorAll<HTMLInputElement>(
        "input[name='paddle-length']",
      ),
    );
    const ballSizeInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>("input[name='ball-size']"),
    );
    const ballSpeedInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>("input[name='ball-speed']"),
    );
    const maxScoreSelect = document.getElementById(
      "max-score-select",
    ) as HTMLSelectElement | null;

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

    ballSpeedInputs.forEach((input) => {
      input.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement;
        if (target.checked && isBallSpeedOption(target.value)) {
          this.service.updateBallSpeed(target.value);
        }
      });
    });

    if (maxScoreSelect) {
      maxScoreSelect.addEventListener("change", (event) => {
        const target = event.target as HTMLSelectElement;
        const value = Number(target.value);
        if (isMaxScoreOption(value)) {
          this.service.updateMaxScore(value);
        } else {
          target.value = String(this.service.getMaxScore());
        }
      });
    }

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
      ballSpeedInputs.forEach((input) => {
        input.checked = input.value === settings.ballSpeed;
      });
      if (
        maxScoreSelect &&
        Number(maxScoreSelect.value) !== settings.maxScore
      ) {
        maxScoreSelect.value = String(settings.maxScore);
      }
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
