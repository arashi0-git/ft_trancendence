import { PlayerRegistrationManager } from "./player-registration-manager";
import type { PlayerOption } from "../types/tournament";
import { escapeHtml } from "../utils/html-utils";
import { formatTemplate, type TranslationSection } from "../types/translations";

interface RegistrationTranslations {
  setup?: TranslationSection;
  playerSelector?: TranslationSection;
  playerRegistration?: TranslationSection;
}

export interface PlayerRegistrationWithCountConfig {
  container: HTMLElement;
  title?: string;
  subtitle?: string;
  showTournamentName?: boolean;
  tournamentNameValue?: string;
  startButtonText?: string;
  backButtonText?: string;
  backButtonClassName?: string;
  requireHumanPlayer?: boolean;
  playerCountOptions?: number[]; // 利用可能なプレイヤー数のオプション（例: [2, 4] または [4, 8]）
  defaultPlayerCount?: number; // デフォルトのプレイヤー数

  translations?: RegistrationTranslations;
  singleVsForFourPlayers?: boolean;

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
    this.playerRegistrationManager = new PlayerRegistrationManager();
    this.config = config;
    // 設定から取得、なければデフォルト値を使用
    this.currentPlayerCount = config.defaultPlayerCount ?? 2;

    if (!config.container) {
      throw new Error("Container element is required");
    }
    const translations = config.translations || {};
    const setup = translations.setup || {};

    const titleHtml = config.title
      ? `<h3 class="text-lg font-semibold text-white mb-2">${escapeHtml(config.title)}</h3>`
      : "";
    const subtitleHtml = config.subtitle
      ? `<p class="text-sm text-gray-300 mb-4">${escapeHtml(config.subtitle)}</p>`
      : "";

    const tournamentLabel = setup.nameLabel || "Tournament Name";
    const tournamentPlaceholder =
      setup.namePlaceholder || "Enter tournament name";

    const tournamentNameHtml = config.showTournamentName
      ? `
        <div class="mb-4 flex justify-center">
          <div class="w-full max-w-sm">
            <label class="block text-sm font-medium text-white mb-1 text-center">${escapeHtml(tournamentLabel)}</label>
            <input
              type="text"
              id="tournament-name-input"
              placeholder="${escapeHtml(tournamentPlaceholder)}"
              maxlength="30"
              value="${escapeHtml(config.tournamentNameValue || "")}"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
        </div>
      `
      : "";

    const playerCountLabel = setup.playerCountLabel || "Number of Players";
    const playerCountOptions = this.getPlayerCountOptionsHtml(setup);

    const backButtonText = config.backButtonText ?? "Back";
    const startButtonText = config.startButtonText ?? "Start";

    config.container.innerHTML = `
      <div class="text-center mb-4">
        ${titleHtml}
        ${subtitleHtml}
      </div>

      ${tournamentNameHtml}

      <div class="mb-4 flex justify-center">
        <div class="w-full max-w-sm">
          <label class="block text-sm font-medium text-white mb-1 text-center">${escapeHtml(playerCountLabel)}</label>
          <select id="player-count-select" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
            ${playerCountOptions}
          </select>
        </div>
      </div>

      <div id="player-registration-container" class="mb-4">
        </div>

      <div class="flex space-x-4">
        <button
          id="back-button"
          type="button"
          class="${escapeHtml(
            this.config.backButtonClassName ||
              "flex-1 bg-purple-400 hover:bg-purple-600 text-white py-2 px-4 rounded border border-purple-400 shadow-lg",
          )}"
        >
          ${escapeHtml(backButtonText)}
        </button>
        <button
          id="start-button"
          type="button"
          class="flex-1 bg-green-700 bg-opacity-30 hover:bg-opacity-50 text-white py-2 px-4 rounded border border-green-700 shadow-lg transition-all duration-200 disabled:bg-opacity-20 disabled:text-gray-400 disabled:border-green-200"
          disabled
        >
          ${escapeHtml(startButtonText)}
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

  private getPlayerCountOptionsHtml(setup: TranslationSection): string {
    // 設定から取得、なければデフォルト値[2, 4]を使用
    const options = this.config?.playerCountOptions ?? [2, 4];
    return options
      .map((count) => {
        const labelTemplate = setup.playerOption || "{{count}} Players";
        const label = formatTemplate(labelTemplate, {
          count,
        });
        const selected =
          count === this.currentPlayerCount ? ' selected="selected"' : "";
        return `<option value="${count}"${selected}>${escapeHtml(label)}</option>`;
      })
      .join("");
  }

  private async renderPlayerRegistration(): Promise<void> {
    if (!this.config) return;

    const container = document.getElementById("player-registration-container");
    if (!container) return;
    const translations = this.config.translations || {};
    const playerSelectorTranslations = translations.playerSelector || {};
    const playerRegistrationTranslations =
      translations.playerRegistration || {};

    try {
      await this.playerRegistrationManager.render({
        container,
        playerCount: this.currentPlayerCount,
        startButtonId: "start-button",
        requireHumanPlayer: this.config.requireHumanPlayer,
        singleVsForFourPlayers: this.config.singleVsForFourPlayers,
        translations: {
          selector: playerSelectorTranslations,
          validation: playerRegistrationTranslations,
        },
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
