import { QuickPlayService } from "./quick-play.service";
import { SpacePageBase } from "../../shared/components/space-page-base";
import { PlayerRegistrationWithCountSelector } from "../../shared/components/player-registration-with-count-selector";
import type { PlayerOption } from "../../shared/types/tournament";
import { i18next, onLanguageChange } from "../../i18n";

type QuickPlayStep = "registration" | "game";

type TranslationSection = Record<string, string>;

interface QuickPlayTranslations {
  pageTitleRegistration?: string;
  pageTitleGame?: string;
  homeButton?: string;
  backToRegistration?: string;
  startGame?: string;
  pauseGame?: string;
  resetGame?: string;
  registrationTitle?: string;
  registrationSubtitle?: string;
  selectPlayers?: string;
  playerOption?: string;
  gameOverTitle?: string;
}

export class QuickPlayPage extends SpacePageBase {
  private service: QuickPlayService;
  private playerRegistrationWithCountSelector: PlayerRegistrationWithCountSelector;
  private currentStep: QuickPlayStep = "registration";
  private selectedPlayerCount: number = 2;
  private t: QuickPlayTranslations = {};
  private registrationCopy: {
    title?: string;
    subtitle?: string;
    playerCountLabel?: string;
    playerCountOption?: string;
    buttons?: { back?: string; start?: string };
  } = {};
  private playerSelectorCopy: TranslationSection = {};
  private playerRegistrationMessages: TranslationSection = {};
  private unsubscribeLanguageChange?: () => void;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new QuickPlayService();
    this.playerRegistrationWithCountSelector =
      new PlayerRegistrationWithCountSelector();
    this.loadTranslations();
    this.unsubscribeLanguageChange = onLanguageChange(
      this.handleLanguageChange.bind(this),
    );
  }

  async render(): Promise<void> {
    this.ensureBaseTemplate();
    await this.renderPlayerRegistrationView();
    this.initializeSpaceBackground();
  }

  private renderGameView(
    playerCount: number,
    playerSelections: (PlayerOption | null)[],
    aiPlayers?: { [key: string]: { difficulty: "easy" | "medium" | "hard" } },
  ): void {
    const contentDiv = this.ensureBaseTemplate();
    if (!contentDiv) {
      console.warn(
        "QuickPlayPage: failed to ensure base template for game view",
      );
      return;
    }

    if (playerSelections.length !== playerCount) {
      console.error(
        `Player selections length (${playerSelections.length}) does not match player count (${playerCount})`,
      );
      return;
    }

    this.playerRegistrationWithCountSelector.destroy();
    this.selectedPlayerCount = playerCount;
    this.currentStep = "game";
    this.updateHeader();

    const gameContent = `
      <div class="space-y-4">
        <div class="text-center">
          <div class="space-x-3">
            <button id="start-game" class="bg-green-600 hover:bg-green-700 text-white px-4 py-1 text-sm rounded border border-green-400 shadow-lg">${this.t.startGame || "Start Game"}</button>
            <button id="pause-game" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-1 text-sm rounded border border-yellow-400 shadow-lg" disabled>${this.t.pauseGame || "Pause"}</button>
            <button id="reset-game" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 text-sm rounded border border-blue-400 shadow-lg">${this.t.resetGame || "Reset"}</button>
          </div>
        </div>

        <div class="flex justify-center">
          <canvas id="pong-canvas" class="border-2 border-gray-300 bg-black max-w-full h-auto"></canvas>
        </div>

        <div class="text-center text-sm text-gray-300">
          ${this.getControlsTemplate(playerCount)}
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
      </div>
    `;
    contentDiv.innerHTML = gameContent;
    this.attachGameEventListeners();
    this.service.initializeGame(
      "pong-canvas",
      playerCount,
      playerSelections,
      aiPlayers,
    );
  }

  private async renderPlayerRegistrationView(): Promise<void> {
    const contentDiv = this.ensureBaseTemplate();
    if (!contentDiv) {
      console.warn(
        "QuickPlayPage: failed to locate #quick-play-content container",
      );
      return;
    }

    this.currentStep = "registration";
    this.updateHeader();

    try {
      const registrationTitle =
        this.t.registrationTitle ||
        this.registrationCopy.title ||
        "Player Registration";
      const registrationSubtitleTemplate =
        this.t.registrationSubtitle || this.registrationCopy.subtitle || "";
      const registrationSubtitle = registrationSubtitleTemplate
        ? this.formatText(registrationSubtitleTemplate, {
            count: this.selectedPlayerCount,
          })
        : "";
      const startButtonText =
        this.t.startGame ||
        this.registrationCopy.buttons?.start ||
        "Start Game";
      const backButtonText =
        this.t.homeButton || this.registrationCopy.buttons?.back || "Back";
      const setupTranslations: TranslationSection = {
        playerCountLabel:
          this.t.selectPlayers ||
          this.registrationCopy.playerCountLabel ||
          "Number of Players",
        playerOption:
          this.t.playerOption ||
          this.registrationCopy.playerCountOption ||
          "{{count}} Players",
      };

      await this.playerRegistrationWithCountSelector.render({
        container: contentDiv,
        title: registrationTitle,
        subtitle: registrationSubtitle,
        showTournamentName: false,
        startButtonText,
        backButtonText,
        requireHumanPlayer: false,
        translations: {
          setup: setupTranslations,
          playerSelector: this.playerSelectorCopy,
          playerRegistration: this.playerRegistrationMessages,
        },
        onBack: () => {
          this.service.navigateToHome();
        },
        onSubmit: (data) => {
          this.selectedPlayerCount = data.playerCount;
          this.startQuickPlayGame(data.playerSelections);
        },
      });
    } catch (error) {
      console.error("Failed to render registration view:", error);
      alert("プレイヤー登録画面の表示に失敗しました");
    }
  }

  private getTemplate(): string {
    const headerTitle =
      this.currentStep === "game"
        ? `<h2 id="quick-play-page-title" class="text-2xl font-bold text-white">${this.t.pageTitleGame || "Quick Play - Pong"}</h2>`
        : `<h2 id="quick-play-page-title" class="text-2xl font-bold text-white"></h2>`;
    const content = `
      <div class="flex justify-between items-center mb-4">
        ${headerTitle}
        <div id="quick-play-header-actions" class="space-x-2"></div>
      </div>
      <div id="quick-play-content"></div>
    `;
    return this.getSpaceTemplate(content);
  }

  private getControlsTemplate(playerCount: number): string {
    const p1Controls = `<p><strong class="text-white">Player 1 (Left-Outer):</strong> W/S</p>`;
    const p2Controls = `<p><strong class="text-white">Player 2 (Right-Outer):</strong> ↑/↓</p>`;
    if (playerCount === 4) {
      const p3Controls = `<p><strong class="text-white">Player 3 (Left-Inner):</strong> R/F</p>`;
      const p4Controls = `<p><strong class="text-white">Player 4 (Right-Inner):</strong> I/K</p>`;
      return `${p1Controls}${p2Controls}${p3Controls}${p4Controls}`;
    }
    return `${p1Controls}${p2Controls}`;
  }

  private startQuickPlayGame(playerSelections: (PlayerOption | null)[]): void {
    // AIプレイヤー設定を構築
    const aiPlayers: {
      [key: string]: { difficulty: "easy" | "medium" | "hard" };
    } = {};

    playerSelections.forEach((selection, index) => {
      if (selection?.isAI && selection.aiDifficulty) {
        const playerKey = `player${index + 1}`;
        aiPlayers[playerKey] = { difficulty: selection.aiDifficulty };
      }
    });

    this.renderGameView(this.selectedPlayerCount, playerSelections, aiPlayers);
  }

  private attachGameEventListeners(): void {
    this.service.attachGameControls();
  }

  private updateHeader(): void {
    const titleElement = this.container.querySelector(
      "#quick-play-page-title",
    ) as HTMLElement | null;
    const actionsContainer = this.container.querySelector(
      "#quick-play-header-actions",
    ) as HTMLElement | null;

    if (!titleElement || !actionsContainer) {
      return;
    }

    let title =
      this.currentStep === "game"
        ? this.t.pageTitleGame || "Quick Play - Pong"
        : "";
    let actionsHtml = "";

    if (this.currentStep === "game") {
      actionsHtml = `
        <button id="quick-play-header-back" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded border border-purple-400">
          ${this.t.backToRegistration || "Back to Registration"}
        </button>
      `;
    }

    titleElement.textContent = title;
    actionsContainer.innerHTML = actionsHtml;

    if (this.currentStep === "game") {
      document
        .getElementById("quick-play-header-back")
        ?.addEventListener("click", async () => {
          this.service.cleanup();
          await this.renderPlayerRegistrationView();
        });
    }
  }

  private ensureBaseTemplate(): HTMLElement | null {
    let contentDiv = this.container.querySelector(
      "#quick-play-content",
    ) as HTMLElement | null;

    if (!contentDiv) {
      this.container.innerHTML = this.getTemplate();
      this.initializeAppHeader();
      contentDiv = this.container.querySelector(
        "#quick-play-content",
      ) as HTMLElement | null;
    }

    return contentDiv;
  }

  destroy(): void {
    this.service.cleanup();
    this.playerRegistrationWithCountSelector.destroy();
    this.cleanupSpaceBackground();
    this.cleanupAppHeader();
    this.unsubscribeLanguageChange?.();
  }

  private loadTranslations(): void {
    this.t =
      (i18next.t("quickPlay", {
        returnObjects: true,
      }) as QuickPlayTranslations) || {};

    this.registrationCopy =
      (i18next.t("playerRegistrationWithCount", {
        returnObjects: true,
      }) as typeof this.registrationCopy) || {};

    this.playerSelectorCopy =
      (i18next.t("playerSelector", {
        returnObjects: true,
      }) as TranslationSection) || {};

    this.playerRegistrationMessages =
      (i18next.t("playerRegistration", {
        returnObjects: true,
      }) as TranslationSection) || {};
  }

  private handleLanguageChange(): void {
    this.loadTranslations();

    if (this.currentStep === "registration") {
      void this.renderPlayerRegistrationView();
    } else if (this.currentStep === "game") {
      //when playing game dont reset the game and only change language for these buttons
      console.warn(
        "QuickPlay: Language change during active match. Updating UI text manually.",
      );
      this.updateHeader();

      const startBtn = document.getElementById("start-game");
      if (startBtn) startBtn.textContent = this.t.startGame || "Start Game";

      const pauseBtn = document.getElementById("pause-game");
      if (pauseBtn) pauseBtn.textContent = this.t.pauseGame || "Pause";

      const resetBtn = document.getElementById("reset-game");
      if (resetBtn) resetBtn.textContent = this.t.resetGame || "Reset";

      const modalTitle = document.querySelector("#game-over-modal h2");
      if (modalTitle)
        modalTitle.textContent = this.t.gameOverTitle || "Game finished!";
    }
  }

  private formatText(
    template: string,
    variables: Record<string, string | number>,
  ): string {
    return Object.entries(variables).reduce(
      (acc, [key, value]) =>
        acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value)),
      template,
    );
  }
}
