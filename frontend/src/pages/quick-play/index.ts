import { QuickPlayService } from "./quick-play.service";
import { SpacePageBase } from "../../shared/components/space-page-base";
import { PlayerRegistrationWithCountSelector } from "../../shared/components/player-registration-with-count-selector";
import type { PlayerOption } from "../../shared/types/tournament";
import {
  formatTemplate,
  type TranslationSection,
} from "../../shared/types/translations";
import { i18next, onLanguageChange } from "../../i18n";
import { AppHeader } from "../../shared/components/app-header";
import { escapeHtml } from "../../shared/utils/html-utils";

type QuickPlayStep = "registration" | "game";

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
  controls?: TranslationSection;
  gameOverTitle?: string;
  winner?: string;
  finalScore?: string;
  resetGameButton?: string;
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

    // URLに応じて適切な画面を表示
    const currentPath = window.location.pathname;
    if (currentPath === "/quick-play/game") {
      // ゲーム画面のURL
      if (this.currentStep === "game") {
        // ゲーム画面が既にレンダリング済みの場合は何もしない
        // (URL変更によるrenderの再呼び出しを避ける)
      } else {
        // ゲームが初期化されていないのに/quick-play/gameにアクセスした場合
        // プレイヤー登録画面にリダイレクト
        this.currentStep = "registration";
        // 次のフレームでリダイレクト（isRenderingフラグがリセットされた後）
        setTimeout(() => {
          this.service.navigateToRegistration();
        }, 0);
        return;
      }
    } else if (currentPath === "/quick-play") {
      // プレイヤー登録画面
      this.currentStep = "registration";
      await this.renderPlayerRegistrationView();
    }

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
          <button id="start-game" class="bg-green-900 bg-opacity-30 hover:bg-opacity-50 text-white px-4 py-1 text-sm rounded border border-green-400 shadow-lg transition-all duration-200">${this.t.startGame || "Start Game"}</button>
          <button id="pause-game" class="bg-purple-900 bg-opacity-30 hover:bg-opacity-50 text-white px-4 py-1 text-sm rounded border border-purple-400 shadow-lg transition-all duration-200 disabled:bg-opacity-20 disabled:text-white disabled:border-purple-300" disabled>${this.t.pauseGame || "Pause"}</button>
          <button id="reset-game" class="bg-red-900 bg-opacity-30 hover:bg-opacity-50 text-white px-4 py-1 text-sm rounded border border-red-400 shadow-lg transition-all duration-200">${this.t.resetGame || "Reset"}</button>
          </div>
        </div>

        <div class="flex justify-center">
          <canvas id="pong-canvas" class="border-2 border-gray-300 bg-black max-w-full h-auto"></canvas>
        </div>

        <div id="quick-play-controls" class="text-center text-sm text-gray-300">
          ${this.getControlsTemplate(playerCount, playerSelections)}
        </div>

        <div class="flex justify-start">
          <button id="quick-play-back-to-registration" class="bg-yellow-600 bg-opacity-30 hover:bg-opacity-50 text-white px-4 py-2 text-sm rounded border border-yellow-500 shadow-lg transition-all duration-200">
            ${this.t.backToRegistration || "Back to Registration"}
          </button>
        </div>

        <div
          id="game-over-modal"
          class="hidden absolute inset-0 flex items-center justify-center bg-black/60 z-50 px-4 backdrop-blur"
        >
          <div
            class="w-full max-w-md bg-purple-400/20 border border-purple-400/50 rounded-2xl shadow-2xl p-8 text-center text-white backdrop-blur-lg"
          >
            <h2
              id="game-over-title"
              class="text-3xl font-bold mb-4 text-purple-100"
            >
              ${this.t.gameOverTitle || "Game finished!"}
            </h2>
            <p class="text-xl mb-2 text-white">
              <span id="game-over-winner-label" class="text-purple-300 font-semibold">${this.t.winner || "Winner:"}</span>
              <span id="winner-name" class="font-semibold text-white"></span>
            </p>
            <p class="text-lg mb-6 text-white">
              <span id="game-over-score-label" class="text-purple-300 font-semibold">${this.t.finalScore || "Final Score:"}</span>
              <span id="final-score" class="font-semibold text-white"></span>
            </p>
            <button
              id="reset-game-modal-btn"
              class="w-full bg-purple-600 bg-opacity-40 hover:bg-opacity-60 text-white py-3 px-6 rounded-lg font-semibold border border-purple-500 shadow-lg transition-all duration-200"
            >
              ${this.t.resetGameButton || this.t.resetGame || "Reset Game"}
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
    document
      .getElementById("quick-play-back-to-registration")
      ?.addEventListener("click", () => {
        this.service.cleanup();
        this.service.navigateToRegistration();
      });
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
        ? formatTemplate(registrationSubtitleTemplate, {
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
        backButtonClassName:
          "flex-1 bg-yellow-600 bg-opacity-30 hover:bg-opacity-50 text-white py-2 px-4 rounded border border-yellow-500 shadow-lg transition-all duration-200",
        requireHumanPlayer: false,
        playerCountOptions: [2, 4], // クイックプレイは2人と4人
        defaultPlayerCount: 2, // デフォルトは2人
        singleVsForFourPlayers: true,
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
        ? `<h2 id="quick-play-page-title" class="text-2xl font-bold text-white text-center">${this.t.pageTitleGame || "Quick Play - Pong"}</h2>`
        : `<h2 id="quick-play-page-title" class="text-2xl font-bold text-white text-center"></h2>`;
    const content = `
      <div class="flex justify-center items-center mb-4">
        ${headerTitle}
      </div>
      <div id="quick-play-header-actions" class="hidden"></div>
      <div id="quick-play-content"></div>
    `;
    return this.getSpaceTemplate(content);
  }

  private getControlsTemplate(
    playerCount: number,
    playerSelections: (PlayerOption | null)[],
  ): string {
    const controls = this.t.controls || {};
    const sideLabel = (key: string, fallback: string): string =>
      controls[key] || fallback;
    const keysValue = (key: string, fallback: string): string =>
      controls[`${key}Keys`] || fallback;

    const getPlayerName = (index: number): string => {
      const player = playerSelections[index];
      return player?.displayName || `Player ${index + 1}`;
    };

    const p1Name = escapeHtml(getPlayerName(0));
    const p2Name = escapeHtml(getPlayerName(1));
    const p1Controls = `<p><strong class="text-white">${p1Name} (${sideLabel("leftOuter", "Left-Outer")}):</strong> ${keysValue("leftOuter", "W/S")}</p>`;
    const p2Controls = `<p><strong class="text-white">${p2Name} (${sideLabel("rightOuter", "Right-Outer")}):</strong> ${keysValue("rightOuter", "↑/↓")}</p>`;

    if (playerCount === 4) {
      const p3Name = escapeHtml(getPlayerName(2));
      const p4Name = escapeHtml(getPlayerName(3));
      const p3Controls = `<p><strong class="text-white">${p3Name} (${sideLabel("leftInner", "Left-Inner")}):</strong> ${keysValue("leftInner", "R/F")}</p>`;
      const p4Controls = `<p><strong class="text-white">${p4Name} (${sideLabel("rightInner", "Right-Inner")}):</strong> ${keysValue("rightInner", "I/K")}</p>`;
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

    // currentStepを先に更新してからURL遷移（render()での判定のため）
    this.currentStep = "game";

    // URL遷移してからゲーム画面を表示
    this.service.navigateToGameView();
    this.renderGameView(this.selectedPlayerCount, playerSelections, aiPlayers);

    // AppHeaderを強制的に再レンダリング
    const headerContainer = document.getElementById("app-header-container");
    if (headerContainer) {
      if (!this.appHeader) {
        // AppHeaderがまだ初期化されていない場合は新規作成
        this.appHeader = new AppHeader(headerContainer);
      }
      this.appHeader.render();
    }
  }

  private attachGameEventListeners(): void {
    this.service.attachGameControls();
  }

  private updateHeader(): void {
    const titleElement = this.container.querySelector(
      "#quick-play-page-title",
    ) as HTMLElement | null;

    if (!titleElement) {
      return;
    }

    let title =
      this.currentStep === "game"
        ? this.t.pageTitleGame || "Quick Play - Pong"
        : "";

    titleElement.textContent = title;
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
    }
  }
}
