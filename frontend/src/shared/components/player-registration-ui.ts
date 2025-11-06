import { AuthService } from "../services/auth-service";
import { escapeHtml } from "../utils/html-utils";

interface RegistrationButtonConfig {
  id?: string;
  text: string;
  classes: string;
}

export interface PlayerRegistrationConfig {
  container: HTMLElement;
  playerCount: number;
  heading?: string;
  subtitle?: string;
  backButton: RegistrationButtonConfig;
  startButton: RegistrationButtonConfig;
  onBack: () => void;
  onSubmit: (aliases: string[]) => void;
  initialAliases?: string[];
}

interface TrackedListener {
  element: HTMLElement;
  event: string;
  handler: EventListener;
}

export class PlayerRegistrationUI {
  private config: PlayerRegistrationConfig | null = null;
  private eventListeners: TrackedListener[] = [];

  async render(config: PlayerRegistrationConfig): Promise<void> {
    this.destroy();
    this.config = config;

    const backButtonId = config.backButton.id ?? "player-registration-back";
    const startButtonId = config.startButton.id ?? "player-registration-start";

    const subtitleHtml = config.subtitle
      ? `<p class="text-sm text-gray-300">${escapeHtml(config.subtitle)}</p>`
      : "";

    config.container.innerHTML = `
      <div class="text-center mb-4">
        ${subtitleHtml}
      </div>

      <div id="player-inputs" class="space-y-3 mb-4"></div>

      <div class="flex space-x-4">
        <button
          id="${backButtonId}"
          class="${config.backButton.classes}"
        >
          ${escapeHtml(config.backButton.text)}
        </button>
        <button
          id="${startButtonId}"
          class="${config.startButton.classes}"
          disabled
        >
          ${escapeHtml(config.startButton.text)}
        </button>
      </div>
    `;

    await this.generatePlayerInputs(config.playerCount, startButtonId);

    this.attachEventListener(
      document.getElementById(backButtonId),
      "click",
      () => config.onBack(),
    );

    this.attachEventListener(
      document.getElementById(startButtonId),
      "click",
      () => this.handleSubmit(startButtonId),
    );
  }

  destroy(): void {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
    this.config = null;
  }

  private async generatePlayerInputs(
    playerCount: number,
    startButtonId: string,
  ): Promise<void> {
    const playerInputsContainer = document.getElementById("player-inputs");
    if (!playerInputsContainer) return;

    playerInputsContainer.innerHTML = "";

    let currentUser: { username: string } | null = null;

    try {
      if (AuthService.isAuthenticated()) {
        const user = await AuthService.getCurrentUser();
        currentUser = {
          username: user.username,
        };
      }
    } catch (error) {
      console.warn(
        "Failed to load current user for player registration:",
        error,
      );
    }

    const initialAliases = this.config?.initialAliases ?? [];

    for (let i = 1; i <= playerCount; i++) {
      const inputDiv = document.createElement("div");

      const placeholder = currentUser
        ? `Select ${currentUser.username} or enter custom alias`
        : `Enter alias for Player ${i}`;

      const defaultValue = initialAliases[i - 1] ?? "";

      inputDiv.innerHTML = `
        <label class="block text-sm font-medium text-white mb-1">Player ${i}</label>
        <input
          type="text"
          id="player-${i}-alias"
          list="player-${i}-options"
          placeholder="${escapeHtml(placeholder)}"
          maxlength="20"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value="${escapeHtml(defaultValue)}"
        >
        ${
          currentUser
            ? `
        <datalist id="player-${i}-options">
          <option value="${escapeHtml(currentUser.username)}">${escapeHtml(currentUser.username)} (You)</option>
        </datalist>
        `
            : ""
        }
      `;

      playerInputsContainer.appendChild(inputDiv);

      const input = inputDiv.querySelector(
        `#player-${i}-alias`,
      ) as HTMLInputElement;

      if (input) {
        this.attachEventListener(input, "input", () =>
          this.validatePlayerInputs(startButtonId),
        );
      }
    }
  }

  private validatePlayerInputs(startButtonId: string): void {
    const startBtn = document.getElementById(
      startButtonId,
    ) as HTMLButtonElement | null;
    const inputs = document.querySelectorAll(
      "#player-inputs input",
    ) as NodeListOf<HTMLInputElement>;

    let allValid = true;
    const aliases = new Set<string>();

    inputs.forEach((input) => {
      const alias = input.value.trim().toLowerCase();

      if (!alias) {
        allValid = false;
        input.classList.add("border-red-500");
      } else if (aliases.has(alias)) {
        allValid = false;
        input.classList.add("border-red-500");
      } else {
        aliases.add(alias);
        input.classList.remove("border-red-500");
      }
    });

    if (startBtn) {
      startBtn.disabled = !allValid;
    }
  }

  private handleSubmit(startButtonId: string): void {
    if (!this.config) return;

    const inputs = document.querySelectorAll(
      "#player-inputs input",
    ) as NodeListOf<HTMLInputElement>;

    const aliases: string[] = [];

    inputs.forEach((input) => {
      const alias = input.value.trim();
      if (alias) {
        aliases.push(alias);
      }
    });

    if (aliases.length !== this.config.playerCount) {
      console.warn("Player aliases validation failed, submission cancelled.");
      this.validatePlayerInputs(startButtonId);
      return;
    }

    this.config.onSubmit(aliases);
  }

  private attachEventListener(
    element: HTMLElement | null,
    event: string,
    handler: EventListener,
  ): void {
    if (!element) return;
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }
}
