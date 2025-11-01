import { PlayerRegistrationManager } from "./player-registration-manager";
import type { PlayerOption } from "../types/tournament";

export interface PlayerRegistrationWithCountConfig {
  container: HTMLElement;
  title?: string;
  subtitle?: string;
  showTournamentName?: boolean;
  tournamentNameValue?: string;
  startButtonText?: string;
  backButtonText?: string;
  requireHumanPlayer?: boolean;
  onBack: () => void;
  onSubmit: (data: {
    playerCount: number;
    playerSelections: (PlayerOption | null)[];
    tournamentName?: string;
  }) => void;
}

export class PlayerRegistrationWithCountSelector {
  private config: PlayerRegistrationWithCountConfig | null = null;
  private playerRegistrationManager: PlayerRegistrationManager;
  private currentPlayerCount: number = 2;
  private renderInProgress: boolean = false;
  private eventListeners: Array<{
    element: Element;
    type: string;
    handler: EventListener;
  }> = [];

  constructor() {
    this.playerRegistrationManager = new PlayerRegistrationManager();
  }

  async render(config: PlayerRegistrationWithCountConfig): Promise<void> {
    this.destroy();
    this.config = config;
    this.currentPlayerCount = 2; // デフォルト2人

    if (!config.container) {
      throw new Error("Container element is required");
    }

    const titleHtml = config.title
      ? `<h3 class="text-lg font-semibold text-white mb-2">${this.escapeHtml(config.title)}</h3>`
      : "";

    const subtitleHtml = config.subtitle
      ? `<p class="text-sm text-gray-300 mb-4">${this.escapeHtml(config.subtitle)}</p>`
      : "";

    const tournamentNameHtml = config.showTournamentName
      ? `
        <div class="mb-4">
          <label class="block text-sm font-medium text-white mb-1">Tournament Name</label>
          <input
            type="text"
            id="tournament-name-input"
            placeholder="Enter tournament name"
            maxlength="50"
            value="${this.escapeHtml(config.tournamentNameValue || "")}"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
      `
      : "";

    config.container.innerHTML = `
      <div class="text-center mb-4">
        ${titleHtml}
        ${subtitleHtml}
      </div>

      ${tournamentNameHtml}

      <div class="mb-4">
        <label class="block text-sm font-medium text-white mb-1">Number of Players</label>
        <select id="player-count-select" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
          <option value="2">2 Players</option>
          <option value="4">4 Players</option>
        </select>
      </div>

      <div id="player-registration-container" class="mb-4">
        <!-- プレイヤー登録UI -->
      </div>

      <div class="flex space-x-4">
        <button
          id="back-button"
          type="button"
          class="flex-1 bg-purple-400 hover:bg-purple-600 text-white py-2 px-4 rounded border border-purple-400 shadow-lg"
        >
          ${this.escapeHtml(config.backButtonText || "Back")}
        </button>
        <button
          id="start-button"
          type="button"
          class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded border border-green-400 shadow-lg"
          disabled
        >
          ${this.escapeHtml(config.startButtonText || "Start")}
        </button>
      </div>
    `;

    try {
      await this.renderPlayerRegistration();
      this.attachEventListeners();
    } catch (error) {
      console.error("Failed to render initial player registration:", error);
      throw new Error("Failed to initialize player registration component");
    }
  }

  private async renderPlayerRegistration(): Promise<void> {
    if (!this.config) return;

    const container = document.getElementById("player-registration-container");
    if (!container) return;

    try {
      await this.playerRegistrationManager.render({
        container,
        playerCount: this.currentPlayerCount,
        startButtonId: "start-button",
        requireHumanPlayer: this.config.requireHumanPlayer,
        onSelectionChange: () => {
          this.validateForm();
        },
      });
    } catch (error) {
      console.error("Failed to render player registration:", error);
      throw error;
    }
  }

  private attachEventListeners(): void {
    // プレイ人数選択
    const playerCountSelect = document.getElementById(
      "player-count-select",
    ) as HTMLSelectElement;
    if (playerCountSelect) {
      this.addEventListener(playerCountSelect, "change", async () => {
        const newPlayerCount = parseInt(playerCountSelect.value, 10);
        if (
          !Number.isNaN(newPlayerCount) &&
          newPlayerCount !== this.currentPlayerCount &&
          !this.renderInProgress
        ) {
          this.renderInProgress = true;
          this.currentPlayerCount = newPlayerCount;
          try {
            await this.renderPlayerRegistration();
          } catch (error) {
            console.error("Failed to update player count:", error);
            // エラーが発生した場合、プレイヤー数を元に戻す
            this.currentPlayerCount =
              parseInt(playerCountSelect.value, 10) === 2 ? 4 : 2;
            playerCountSelect.value = this.currentPlayerCount.toString();
          } finally {
            this.renderInProgress = false;
          }
        }
      });
    }

    // トーナメント名入力（バリデーション用）
    if (this.config?.showTournamentName) {
      const tournamentNameInput = document.getElementById(
        "tournament-name-input",
      ) as HTMLInputElement;
      if (tournamentNameInput) {
        this.addEventListener(tournamentNameInput, "input", () => {
          this.validateForm();
        });
      }
    }

    // 戻るボタン
    const backButton = document.getElementById("back-button");
    if (backButton) {
      this.addEventListener(backButton, "click", () => {
        this.config?.onBack();
      });
    }

    // 開始ボタン
    const startButton = document.getElementById("start-button");
    if (startButton) {
      this.addEventListener(startButton, "click", () => {
        this.handleSubmit();
      });
    }
  }

  private validateForm(): void {
    const startButton = document.getElementById(
      "start-button",
    ) as HTMLButtonElement;
    if (!startButton) return;

    let isValid = true;

    // プレイヤー登録のバリデーション
    if (!this.playerRegistrationManager.isValid()) {
      isValid = false;
    }

    // トーナメント名のバリデーション
    if (this.config?.showTournamentName) {
      const tournamentNameInput = document.getElementById(
        "tournament-name-input",
      ) as HTMLInputElement;
      if (tournamentNameInput && !tournamentNameInput.value.trim()) {
        isValid = false;
      }
    }

    startButton.disabled = !isValid;
  }

  private handleSubmit(): void {
    if (!this.config) return;

    if (!this.playerRegistrationManager.isValid()) {
      console.warn("Player registration validation failed");
      return;
    }

    const playerSelections =
      this.playerRegistrationManager.getPlayerSelections();

    let tournamentName: string | undefined;
    if (this.config.showTournamentName) {
      const tournamentNameInput = document.getElementById(
        "tournament-name-input",
      ) as HTMLInputElement;
      if (tournamentNameInput) {
        tournamentName = tournamentNameInput.value.trim();
        if (!tournamentName) {
          console.warn("Tournament name is required");
          return;
        }
      }
    }

    this.config.onSubmit({
      playerCount: this.currentPlayerCount,
      playerSelections,
      tournamentName,
    });
  }

  private addEventListener(
    element: Element,
    type: string,
    handler: EventListener,
  ): void {
    element.addEventListener(type, handler);
    this.eventListeners.push({ element, type, handler });
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return String(text).replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
  }

  public getCurrentPlayerCount(): number {
    return this.currentPlayerCount;
  }

  public getPlayerSelections(): (PlayerOption | null)[] {
    return this.playerRegistrationManager.getPlayerSelections();
  }

  public isValid(): boolean {
    let isValid = this.playerRegistrationManager.isValid();

    if (this.config?.showTournamentName) {
      const tournamentNameInput = document.getElementById(
        "tournament-name-input",
      ) as HTMLInputElement;
      if (tournamentNameInput && !tournamentNameInput.value.trim()) {
        isValid = false;
      }
    }

    return isValid;
  }

  public destroy(): void {
    this.eventListeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    this.eventListeners = [];
    this.playerRegistrationManager.destroy();
    this.renderInProgress = false;
    this.config = null;
  }
}
