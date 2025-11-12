import { GameManagerService } from "../../shared/services/game-manager.service";
import { NotificationService } from "../../shared/services/notification.service";
import { router } from "../../routes/router";
import {
  TournamentDataService,
  type TournamentPlayer,
  type TournamentMatch,
} from "../../shared/services/tournament-data.service";
import { gameCustomizationService } from "../../shared/services/game-customization.service";
import { PlayerRegistrationWithCountSelector } from "../../shared/components/player-registration-with-count-selector";
import {
  type PlayerSelectorTranslations,
  type TranslationSection,
  formatTemplate,
} from "../../shared/types/translations";
import { onLanguageChange, translate, i18next } from "../../i18n";
import { escapeHtml } from "../../shared/utils/html-utils";
import { HistoryService } from "../../shared/services/history-service";
import { AuthService } from "../../shared/services/auth-service";
import type { PublicUser } from "../../shared/types/user";

interface TournamentTranslations {
  titles?: TranslationSection;
  buttons?: TranslationSection;
  setup?: TranslationSection;
  registration?: TranslationSection;
  errors?: TranslationSection;
  bracket?: TranslationSection;
  match?: TranslationSection;
  results?: TranslationSection;
  rounds?: TranslationSection;
  notifications?: TranslationSection;
  modal?: TranslationSection;
  playerSelector?: TranslationSection;
  playerRegistration?: TranslationSection;
}

export type TournamentStep = "registration" | "bracket" | "match" | "results";

type ViewRenderer = (container: HTMLElement) => void | Promise<void>;

type TranslateFn = typeof translate;

type NavigationKey = TournamentStep | "fallback";

interface StepNavigationText {
  pageTitle: string;
  backButtonLabel: string;
}

type NavigationCopy = Record<NavigationKey, StepNavigationText>;

type NavigationCopyInput = Partial<
  Record<NavigationKey, Partial<StepNavigationText>>
>;

type ElementConstructor<T extends HTMLElement> = new (...args: never[]) => T;

interface GameOverModalElements {
  modal: HTMLElement;
  title: HTMLElement;
  message: HTMLElement;
  continueButton: HTMLButtonElement;
}

// TournamentService - トーナメント機能の管理
export class TournamentService {
  private currentStep: TournamentStep = "registration";
  private currentPath: string = "/tournament";
  private gameManager: GameManagerService;
  private tournamentData: TournamentDataService;
  private notificationService: NotificationService;
  private playerRegistrationWithCountSelector: PlayerRegistrationWithCountSelector;
  private readonly viewRenderers: Record<TournamentStep, ViewRenderer>;
  private navigationCopy: NavigationCopy;
  private readonly translateFn: TranslateFn | null;
  private t: TournamentTranslations;
  private contentContainer: HTMLElement | null = null;
  private cachedGameOverModal: GameOverModalElements | null = null;
  private unsubscribeLanguageChange: (() => void) | null = null;
  private eventListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];
  private currentUser: PublicUser | null = null;
  private currentUserPromise: Promise<PublicUser | null> | null = null;

  constructor(translateFn?: TranslateFn) {
    this.gameManager = new GameManagerService();
    this.tournamentData = TournamentDataService.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.playerRegistrationWithCountSelector =
      new PlayerRegistrationWithCountSelector();
    this.translateFn = translateFn ?? translate;
    this.t = i18next.t("tournament", {
      returnObjects: true,
    }) as TournamentTranslations;

    this.navigationCopy = this.buildNavigationCopy();
    this.viewRenderers = {
      registration: this.renderRegistrationView.bind(this),
      bracket: this.renderBracketView.bind(this),
      match: this.renderMatchView.bind(this),
      results: this.renderResultsView.bind(this),
    };
    this.unsubscribeLanguageChange = onLanguageChange(
      this.handleLanguageChange.bind(this),
    );
    void this.ensureCurrentUser();
  }

  setCurrentPath(path: string): void {
    this.currentPath = path;
    this.determineStepFromPath(path);
  }

  private handleLanguageChange(): void {
    this.t = i18next.t("tournament", {
      returnObjects: true,
    }) as TournamentTranslations;

    this.navigationCopy = this.buildNavigationCopy();

    if (this.contentContainer) {
      this.initializeCurrentView();
    }
  }

  private determineStepFromPath(path: string): void {
    if (path === "/tournament" || path === "/tournament/") {
      this.currentStep = "registration";
    } else if (path === "/tournament/bracket") {
      this.currentStep = "bracket";
    } else if (path.startsWith("/tournament/match/")) {
      this.currentStep = "match";
    } else if (path === "/tournament/results") {
      this.currentStep = "results";
    }
  }

  async initializeCurrentView(): Promise<void> {
    const container = this.getContentContainer();
    if (!container) return;

    // bracket, match, results画面にはトーナメントデータが必要
    const requiresTournamentData = ["bracket", "match", "results"].includes(
      this.currentStep,
    );
    if (requiresTournamentData && !this.tournamentData.getCurrentTournament()) {
      console.warn(
        `Cannot render ${this.currentStep} without tournament data, redirecting to home`,
      );
      router.navigate("/");
      return;
    }

    this.clearEventListeners();

    const renderer = this.viewRenderers[this.currentStep];
    await Promise.resolve(renderer(container));
  }

  // ナビゲーションテキスト構築
  private buildNavigationCopy(): NavigationCopy {
    const defaults: NavigationCopy = {
      registration: {
        pageTitle: "Player Registration",
        backButtonLabel: "Home",
      },
      bracket: {
        pageTitle: "Tournament Bracket",
        backButtonLabel: "Back",
      },
      match: {
        pageTitle: "Tournament Match",
        backButtonLabel: "Back",
      },
      results: {
        pageTitle: "Tournament Results",
        backButtonLabel: "Back",
      },
      fallback: {
        pageTitle: "Tournament Mode",
        backButtonLabel: "Back",
      },
    };

    const translator = this.translateFn;
    if (!translator) {
      return defaults;
    }

    const localized = translator("tournament.navigation", {
      returnObjects: true,
    });

    return this.mergeNavigationCopy(defaults, localized);
  }

  // 翻訳データのマージ
  private mergeNavigationCopy(
    base: NavigationCopy,
    localized: unknown,
  ): NavigationCopy {
    if (!localized || typeof localized !== "object") {
      return base;
    }

    const overrides = localized as NavigationCopyInput;
    const result: NavigationCopy = { ...base };
    (Object.keys(base) as Array<NavigationKey>).forEach((key) => {
      const override = overrides[key];
      if (!override) {
        return;
      }
      result[key] = {
        pageTitle: override.pageTitle ?? base[key].pageTitle,
        backButtonLabel: override.backButtonLabel ?? base[key].backButtonLabel,
      };
    });
    return result;
  }

  // コンテンツ要素の取得
  private getContentContainer(): HTMLElement | null {
    if (
      this.contentContainer &&
      document.body.contains(this.contentContainer)
    ) {
      return this.contentContainer;
    }

    const container = document.getElementById("tournament-content");
    if (container instanceof HTMLElement) {
      this.contentContainer = container;
      return container;
    }

    console.warn("Tournament content container not found.");
    this.contentContainer = null;
    return null;
  }

  // IDによる要素検索
  private queryElement<T extends HTMLElement>(
    id: string,
    elementConstructor?: ElementConstructor<T>,
  ): T | null {
    const element = document.getElementById(id);
    if (!element) {
      return null;
    }

    if (elementConstructor && !(element instanceof elementConstructor)) {
      console.warn(
        `Element with ID '${id}' is not instance of ${
          elementConstructor.name || "expected type"
        }`,
      );
      return null;
    }
    return element as T;
  }

  // モーダル要素の取得
  private getGameOverModalElements(): GameOverModalElements | null {
    if (
      this.cachedGameOverModal &&
      document.body.contains(this.cachedGameOverModal.modal)
    ) {
      return this.cachedGameOverModal;
    }

    const modal = this.queryElement<HTMLElement>("game-over-modal");
    const title = this.queryElement<HTMLElement>("game-over-title");
    const message = this.queryElement<HTMLElement>("game-over-message");
    const continueButton = this.queryElement<HTMLButtonElement>(
      "game-over-continue-btn",
      HTMLButtonElement,
    );

    if (modal && title && message && continueButton) {
      this.cachedGameOverModal = {
        modal,
        title,
        message,
        continueButton,
      };
      return this.cachedGameOverModal;
    }

    this.cachedGameOverModal = null;
    return null;
  }

  // クリックイベントの設定
  private bindClick<T extends HTMLElement>(
    elementId: string,
    handler: () => void,
    element?: T | null,
    elementConstructor?: ElementConstructor<T>,
  ): void {
    this.clearEventListenersForId(elementId, "click");
    const target =
      element ?? this.queryElement<T>(elementId, elementConstructor);
    if (!target) {
      console.warn(
        `Element with ID '${elementId}' not found for click binding.`,
      );
      return;
    }
    const listener: EventListener = () => handler();
    this.addEventListenerWithTracking(target, "click", listener);
  }

  // 試合ボタンの取得
  private getMatchControlButtons(): {
    startButton: HTMLButtonElement | null;
    pauseButton: HTMLButtonElement | null;
    resetButton: HTMLButtonElement | null;
  } {
    return {
      startButton: this.queryElement<HTMLButtonElement>(
        "start-tournament-game",
        HTMLButtonElement,
      ),
      pauseButton: this.queryElement<HTMLButtonElement>(
        "pause-tournament-game",
        HTMLButtonElement,
      ),
      resetButton: this.queryElement<HTMLButtonElement>(
        "reset-tournament-game",
        HTMLButtonElement,
      ),
    };
  }
  private async renderRegistrationView(container: HTMLElement): Promise<void> {
    const reg = this.t.registration || {};
    const setup = this.t.setup || {};
    const buttons = this.t.buttons || {};
    const playerSelector = i18next.t("playerSelector", {
      returnObjects: true,
    }) as TranslationSection;
    const playerRegistration = i18next.t("playerRegistration", {
      returnObjects: true,
    }) as TranslationSection;
    const subtitle = this.translateFn
      ? (this.translateFn("tournament.registration.subtitle", {
          name: setup.nameDefault || "Pong Tournament",
          count: 2,
        }) as string)
      : "Tournament Setup";
    try {
      await this.playerRegistrationWithCountSelector.render({
        container,
        title: reg.title || "Player Registration",
        subtitle: subtitle,
        showTournamentName: true,
        tournamentNameValue: setup.nameDefault || "Pong Tournament",
        startButtonText: buttons.startTournament || "Start Tournament",
        backButtonText: buttons.home || "Back to Home",
        backButtonClassName:
          "flex-1 bg-yellow-600 bg-opacity-30 hover:bg-opacity-50 text-white py-2 px-4 rounded border border-yellow-500 shadow-lg transition-all duration-200",
        requireHumanPlayer: true,
        playerCountOptions: [4, 8], // トーナメントは4人と8人
        defaultPlayerCount: 4, // デフォルトは4人
        translations: {
          setup: setup,
          playerSelector: playerSelector,
          playerRegistration: playerRegistration,
        },
        onBack: () => {
          router.navigate("/");
        },
        onSubmit: (data) => {
          if (!data.tournamentName) {
            this.notificationService.error(
              setup.missingName || "Please enter tournament name",
            );
            return;
          }

          // トーナメントを作成
          this.tournamentData.createTournament(
            data.tournamentName,
            data.playerCount,
          );

          // プレイヤー登録
          data.playerSelections
            .filter((selection) => selection !== null)
            .forEach((selection) => {
              if (selection) {
                this.tournamentData.addPlayerFromSelection(selection);
              }
            });

          // マッチ生成
          try {
            this.tournamentData.generateMatches();
            this.navigateToBracket();
          } catch (error) {
            this.notificationService.handleUnexpectedError(
              error,
              "Failed to generate matches",
            );
          }
        },
      });
    } catch (error) {
      this.notificationService.handleUnexpectedError(
        error,
        "Failed to render registration view",
      );
      router.navigate("/");
    }
  }

  navigateToBracket(): void {
    this.navigate("/tournament/bracket");
  }

  private navigate(path: string): void {
    router.navigate(path);
  }

  getPageTitle(): string {
    if (this.currentStep === "registration" || this.currentStep === "match") {
      return "";
    }

    const stepCopy =
      this.navigationCopy[this.currentStep] ?? this.navigationCopy.fallback;
    return stepCopy.pageTitle;
  }

  getBackButtonTemplate(): string {
    return "";
  }

  private addEventListenerWithTracking(
    element: HTMLElement,
    event: string,
    handler: EventListener,
  ): void {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  private attachEventListenerSafely(
    elementId: string,
    event: string,
    handler: EventListener,
    required: boolean = true,
  ): void {
    const element = document.getElementById(elementId);
    if (!element) {
      if (required) {
        console.warn(`Required element with ID '${elementId}' not found`);
      }
      return;
    }
    this.addEventListenerWithTracking(element as HTMLElement, event, handler);
  }

  private clearEventListeners(): void {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  cleanup(): void {
    this.clearEventListeners();
    this.gameManager.cleanup();
    this.playerRegistrationWithCountSelector.destroy();
    this.unsubscribeLanguageChange?.();
    this.unsubscribeLanguageChange = null;
    this.contentContainer = null;
    this.cachedGameOverModal = null;
  }

  private renderBracketView(container: HTMLElement): void {
    const tournament = this.tournamentData.getCurrentTournament();
    if (!tournament) {
      router.navigate("/tournament");
      return;
    }

    const currentRoundMatches = this.tournamentData.getCurrentRoundMatches();
    const bracket = this.t.bracket || {};
    const buttons = this.t.buttons || {};

    const matchesHtml = currentRoundMatches
      .map((match) => {
        const player1 = this.tournamentData.getPlayer(match.player1Id);
        const player2 = this.tournamentData.getPlayer(match.player2Id);

        const player1Alias =
          player1?.alias || bracket.unknownPlayer || "Unknown";
        const player2Alias =
          player2?.alias || bracket.unknownPlayer || "Unknown";

        return `
        <div class="bg-black bg-opacity-30 p-4 rounded border border-cyan-400 border-opacity-50">
          <div class="flex justify-between items-center">
            <div class="text-center flex-1">
              <div class="font-semibold text-white">${escapeHtml(player1Alias)}</div>
              ${match.score ? `<div class="text-sm text-gray-600">${match.score.player1}</div>` : ""}
            </div>
            <div class="mx-4 text-gray-300">${bracket.vs || "VS"}</div>
            <div class="text-center flex-1">
              <div class="font-semibold text-white">${escapeHtml(player2Alias)}</div>
              ${match.score ? `<div class="text-sm text-gray-600">${match.score.player2}</div>` : ""}
            </div>
            <div class="ml-4">
              ${
                match.status === "pending"
                  ? `<button data-match-id="${match.id}" class="play-match-btn bg-green-700 bg-opacity-30 hover:bg-opacity-50 text-white px-3 py-1 rounded text-sm border border-green-600 shadow transition-all duration-200">${buttons.playMatch || "Play"}</button>`
                  : match.status === "completed"
                    ? `<span class="text-green-600 font-semibold">✓</span>`
                    : `<span class="text-blue-600">${buttons.playing || "Playing..."}</span>`
              }
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    const remainingPlayers = currentRoundMatches.length * 2;
    const roundName = this.getRoundLabel(tournament.currentRound);
    const remainingText = this.translateFn
      ? (this.translateFn("tournament.bracket.remaining", {
          roundName: roundName,
          count: remainingPlayers,
        }) as string)
      : `${roundName} (${remainingPlayers} players remaining)`;

    container.innerHTML = `
      <div class="text-center mb-4">
        <p class="text-gray-300">${remainingText}</p>
      </div>
      <div class="space-y-4 mb-6">
        ${matchesHtml}
      </div>
      <div class="text-center">
        <button id="new-tournament-btn" class="bg-pink-900 bg-opacity-30 hover:bg-opacity-50 text-white px-6 py-2 rounded border border-pink-400 shadow-lg transition-all duration-200">
          ${buttons.newTournament || "New Tournament"}
        </button>
      </div>
    `;

    this.attachEventListenersToElements(
      ".play-match-btn",
      "click",
      (element) => {
        const matchId = element.getAttribute("data-match-id");
        if (matchId) {
          this.navigateToMatch(matchId);
        }
      },
    );

    this.attachEventListenerSafely("new-tournament-btn", "click", () => {
      this.tournamentData.clearTournament();
      router.navigate("/tournament");
    });
  }

  private renderMatchView(container: HTMLElement): void {
    const matchId = this.extractMatchIdFromPath();
    const match = this.tournamentData.getMatch(matchId);

    if (!match) {
      this.navigateToBracket();
      return;
    }
    const tMatch = this.t.match || {};
    const tTitles = this.t.titles || {};
    const tButtons = this.t.buttons || {};

    const player1 = this.tournamentData.getPlayer(match.player1Id);
    const player2 = this.tournamentData.getPlayer(match.player2Id);

    const p1Alias = player1?.alias || `${tMatch.playerDefault || "Player"} 1`;
    const p2Alias = player2?.alias || `${tMatch.playerDefault || "Player"} 2`;

    const heading = this.translateFn
      ? (this.translateFn("tournament.match.heading", {
          player1: p1Alias,
          player2: p2Alias,
        }) as string)
      : `${p1Alias} vs ${p2Alias}`;
    const { maxScore } = gameCustomizationService.getSettings();
    const matchIdPattern = /round-(\d+)-match-(\d+)/i;
    const matchIdMatch = matchIdPattern.exec(matchId);
    const roundNumber =
      matchIdMatch && matchIdMatch[1]
        ? Number.parseInt(matchIdMatch[1], 10)
        : (match.round ?? 1);
    const matchNumber =
      matchIdMatch && matchIdMatch[2]
        ? Number.parseInt(matchIdMatch[2], 10)
        : 1;

    const tournament = this.tournamentData.getCurrentTournament();
    const totalPlayers = tournament?.players.length ?? 0;
    const localizedDefaultRound = this.t.rounds?.round
      ? formatTemplate(this.t.rounds.round, { number: roundNumber })
      : `Round ${roundNumber}`;
    const roundName =
      totalPlayers > 0
        ? this.getRoundLabel(roundNumber)
        : localizedDefaultRound;
    const matchLabel = this.translateFn
      ? (this.translateFn("tournament.match.matchNumber", {
          number: matchNumber,
        }) as string) || `Match ${matchNumber}`
      : `Match ${matchNumber}`;

    const identifier = this.translateFn
      ? (this.translateFn("tournament.match.identifier", {
          roundNumber,
          matchNumber,
          roundName,
          matchLabel,
        }) as string)
      : `${roundName} - ${matchLabel}`;

    const details = this.translateFn
      ? (this.translateFn("tournament.match.details", {
          identifier,
          points: maxScore,
        }) as string)
      : `${escapeHtml(identifier)} - First to ${maxScore} points wins`;
    const controlsLeft = this.translateFn
      ? (this.translateFn("tournament.match.controlsLeft", {
          player: p1Alias,
        }) as string)
      : `<strong>${escapeHtml(p1Alias)}:</strong> W/S (Up/Down)`;
    const controlsRight = this.translateFn
      ? (this.translateFn("tournament.match.controlsRight", {
          player: p2Alias,
        }) as string)
      : `<strong>${escapeHtml(p2Alias)}:</strong> ↑/↓ (Up/Down)`;
    const tournamentName =
      this.tournamentData.getCurrentTournament()?.name ||
      tTitles.match ||
      tTitles.pageTitle ||
      "Tournament";
    const vsLabel =
      (this.translateFn
        ? (this.translateFn("tournament.bracket.vs", {}) as string)
        : undefined) ||
      this.t.bracket?.vs ||
      "VS";

    const combinedHeading = `
      <div class="flex flex-wrap items-center justify-center gap-3 text-center mb-3 text-white">
        <span class="text-2xl font-semibold tracking-wide">${escapeHtml(tournamentName)}</span>
        <span class="text-2xl font-semibold text-gray-500">•</span>
        <span class="flex flex-wrap items-center justify-center gap-2" aria-label="${escapeHtml(heading)}">
          <span class="text-2xl font-semibold tracking-wide text-blue-300">${escapeHtml(p1Alias)}</span>
          <span class="text-2xl font-semibold tracking-wide text-white">${escapeHtml(vsLabel)}</span>
          <span class="text-2xl font-semibold tracking-wide text-red-300">${escapeHtml(p2Alias)}</span>
        </span>
      </div>
    `;

    container.innerHTML = `
      <!-- Combined heading -->
      ${combinedHeading}
      <p class="text-sm text-gray-400 text-center mb-3">${details}</p>

      <!-- コンパクトなボタン -->
      <div class="mb-2 text-center">
        <div class="space-x-2">
          <button id="start-tournament-game" class="bg-green-900 bg-opacity-30 hover:bg-opacity-50 text-white px-4 py-1 text-sm rounded border border-green-400 shadow-lg transition-all duration-200">
            ${tButtons.startMatch || "Start Match"}
          </button>
          <button id="pause-tournament-game" class="bg-purple-700 bg-opacity-30 hover:bg-opacity-50 text-white px-4 py-1 text-sm rounded border border-purple-400 shadow-lg transition-all duration-200 disabled:bg-opacity-20 disabled:text-gray-400 disabled:border-purple-300" disabled>
            ${tButtons.pause || "Pause"}
          </button>
          <button id="reset-tournament-game" class="bg-red-900 bg-opacity-30 hover:bg-opacity-50 text-white px-4 py-1 text-sm rounded border border-red-400 shadow-lg transition-all duration-200">
            ${tButtons.reset || "Reset"}
          </button>
        </div>
      </div>
      
      <!-- 大きなゲームフィールド -->
      <div class="flex justify-center mb-2 w-full">
        <canvas id="tournament-pong-canvas" class="border-2 border-gray-300 bg-black rounded-lg shadow-lg max-w-full max-h-[80vh]" style="width: 100%; height: auto;"></canvas>
      </div>
      
      <!-- コンパクトなコントロール説明 -->
      <div class="text-center text-xs text-gray-400">
        <p>${controlsLeft}</p>
        <p>${controlsRight}</p>
      </div>
    `;

    this.initializeMatchGame(matchId);
  }

  private renderResultsView(container: HTMLElement): void {
    const tournament = this.tournamentData.getCurrentTournament();
    const winner = this.tournamentData.getTournamentWinner();

    if (!tournament || !winner) {
      router.navigate("/tournament");
      return;
    }

    const tResults = this.t.results || {};
    const tButtons = this.t.buttons || {};

    const winnerText = this.translateFn
      ? (this.translateFn("tournament.results.winner", {
          name: winner.alias,
        }) as string)
      : `Winner: ${escapeHtml(winner.alias)}`;
    const recordText = this.translateFn
      ? (this.translateFn("tournament.results.record", {
          wins: winner.wins,
          losses: winner.losses,
        }) as string)
      : `Wins: ${winner.wins} | Losses: ${winner.losses}`;

    container.innerHTML = `
      <div class="text-center">
        <h3 class="text-2xl font-bold mb-4 text-white">${tResults.title || "🏆 Tournament Complete!"}</h3>
        <div class="bg-yellow-50 bg-opacity-10 p-6 rounded-lg mb-6 border border-yellow-400">
          <h4 class="text-xl font-semibold text-yellow-300">${winnerText}</h4>
          <p class="text-yellow-200">${recordText}</p>
        </div>
        <div class="space-y-2">
          <button id="new-tournament" class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded">
            ${tButtons.startNewTournament || "Start New Tournament"}
          </button>
        </div>
      </div>
    `;

    this.attachEventListenerSafely("new-tournament", "click", () => {
      this.tournamentData.clearTournament();
      router.navigate("/tournament");
    });
  }

  private attachEventListenersToElements(
    selector: string,
    event: string,
    handler: (element: HTMLElement) => void,
  ): void {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      const wrappedHandler = () => handler(element as HTMLElement);
      this.addEventListenerWithTracking(
        element as HTMLElement,
        event,
        wrappedHandler,
      );
    });
  }

  navigateToMatch(matchId: string): void {
    // ブラケット画面の履歴に「試合から戻る」フラグを設定
    window.history.replaceState(
      { fromMatch: true },
      "",
      window.location.pathname,
    );
    this.navigate(`/tournament/match/${matchId}`);
  }

  navigateToResults(): void {
    this.navigate("/tournament/results");
  }

  handleBackNavigation(): void {
    switch (this.currentStep) {
      case "registration":
        this.navigate("/");
        break;
      case "bracket":
        router.navigate("/tournament");
        break;
      case "match":
        router.navigate("/tournament");
        break;
      case "results":
        router.navigate("/tournament");
        break;
      default:
        this.navigate("/");
    }
  }

  private extractMatchIdFromPath(): string {
    const parts = this.currentPath.split("/").filter(Boolean);
    return parts[parts.length - 1] || "unknown";
  }

  private initializeMatchGame(matchId: string): void {
    console.log(`Initializing Match: ${matchId}`);

    const match = this.tournamentData.getMatch(matchId);
    if (!match) {
      console.error(`Match ${matchId} not found`);
      return;
    }

    const player1 = this.tournamentData.getPlayer(match.player1Id);
    const player2 = this.tournamentData.getPlayer(match.player2Id);

    console.log(
      `Player 1: ${player1?.alias}, isAI: ${player1?.isAI}, difficulty: ${player1?.aiDifficulty}`,
    );
    console.log(
      `Player 2: ${player2?.alias}, isAI: ${player2?.isAI}, difficulty: ${player2?.aiDifficulty}`,
    );

    // AIプレイヤー設定を構築
    const aiPlayers: {
      player1?: { difficulty: "easy" | "medium" | "hard" };
      player2?: { difficulty: "easy" | "medium" | "hard" };
    } = {};
    if (player1?.isAI && player1.aiDifficulty) {
      aiPlayers.player1 = { difficulty: player1.aiDifficulty };
      console.log(
        `Setting AI for player1 with difficulty: ${player1.aiDifficulty}`,
      );
    }
    if (player2?.isAI && player2.aiDifficulty) {
      aiPlayers.player2 = { difficulty: player2.aiDifficulty };
      console.log(
        `Setting AI for player2 with difficulty: ${player2.aiDifficulty}`,
      );
    }

    this.gameManager.cleanup();
    this.gameManager.initializeGame({
      mode: "tournament",
      canvasId: "tournament-pong-canvas",
      playerNames: {
        player1: player1?.alias,
        player2: player2?.alias,
      },
      aiPlayers: Object.keys(aiPlayers).length > 0 ? aiPlayers : undefined,
      onGameEnd: (data: { winner: number; score1: number; score2: number }) => {
        console.log(`Match Ended: ${matchId}`, data);
        this.handleMatchEnd(matchId, data.winner, {
          player1: data.score1,
          player2: data.score2,
        });
      },
    });

    const { startButton, pauseButton, resetButton } =
      this.getMatchControlButtons();

    this.bindClick(
      "start-tournament-game",
      () => {
        this.gameManager.startGame();
        if (startButton) startButton.disabled = true;
        if (pauseButton) pauseButton.disabled = false;
      },
      startButton,
      HTMLButtonElement,
    );

    this.bindClick(
      "pause-tournament-game",
      () => {
        this.gameManager.pauseGame();
        if (startButton) startButton.disabled = false;
        if (pauseButton) pauseButton.disabled = true;
      },
      pauseButton,
      HTMLButtonElement,
    );

    this.bindClick(
      "reset-tournament-game",
      () => {
        this.gameManager.resetGame();
        if (startButton) startButton.disabled = false;
        if (pauseButton) pauseButton.disabled = true;
      },
      resetButton,
      HTMLButtonElement,
    );
  }

  private handleMatchEnd(
    matchId: string,
    winner: number,
    score: { player1: number; player2: number },
  ): void {
    console.log(`Handling Match End: ${matchId}`);

    try {
      const match = this.tournamentData.getMatch(matchId);
      if (!match) {
        console.error(`Match ${matchId} not found`);
        return;
      }

      const winnerId = winner === 1 ? match.player1Id : match.player2Id;
      this.tournamentData.completeMatch(matchId, winnerId, score);
      void this.recordTournamentMatchHistory(match, score, winnerId);

      const winnerPlayer = this.tournamentData.getPlayer(winnerId);
      let winnerAlias: string;

      if (winnerPlayer && winnerPlayer.isAI && winnerPlayer.aiDifficulty) {
        const tSelector = i18next.t("playerSelector", {
          returnObjects: true,
        }) as PlayerSelectorTranslations;
        const difficultyLabel =
          tSelector.difficulty?.[winnerPlayer.aiDifficulty] ||
          winnerPlayer.aiDifficulty;
        const playerIndex = winner;
        const template =
          tSelector.aiDisplayName || "AI Player {{index}} ({{difficulty}})";
        winnerAlias = template
          .replace("{{index}}", playerIndex.toString())
          .replace("{{difficulty}}", difficultyLabel);
      } else {
        winnerAlias = winnerPlayer?.alias || "Player";
      }
      const modalTitle = this.translateFn
        ? (this.translateFn("tournament.modal.playerWins", {
            player: winnerAlias,
          }) as string)
        : `${winnerAlias} Wins!`;

      const modalMessage = this.translateFn
        ? (this.translateFn("tournament.modal.matchResult", {
            player: winnerAlias,
            score1: score.player1,
            score2: score.player2,
          }) as string)
        : `${winnerAlias} wins the match ${score.player1} - ${score.player2}!`;

      this.showGameOverModal(modalTitle, modalMessage, () => {
        console.log("Continue button clicked. Checking tournament state...");
        if (this.tournamentData.isTournamentComplete()) {
          console.log("Tournament completed, navigating to results.");
          this.navigateToResults();
        } else if (this.tournamentData.canAdvanceToNextRound()) {
          console.log("Advancing to next round.");
          const advanced = this.tournamentData.generateNextRound();
          if (!advanced) {
            console.warn(
              "Failed to generate next round despite eligibility. Staying on current bracket.",
            );
          }
          this.navigateToBracket();
        } else {
          console.log("Current round not finished. Navigating to bracket.");
          this.navigateToBracket();
        }
      });

      const { startButton, pauseButton } = this.getMatchControlButtons();
      if (startButton) {
        startButton.disabled = false;
      }
      if (pauseButton) {
        pauseButton.disabled = true;
      }
    } catch (error) {
      console.error("Error in handleMatchEnd:", error);
      this.navigateToBracket();
    }
  }

  private showGameOverModal(
    modalTitleText: string,
    modalMessageText: string,
    onContinue: () => void,
  ): void {
    const modalElements = this.getGameOverModalElements();

    if (modalElements) {
      const { modal, title, message, continueButton } = modalElements;
      title.textContent = modalTitleText;
      message.textContent = modalMessageText;

      const tButtons = this.t.buttons || {};
      continueButton.textContent = tButtons.continue || "Continue";

      modal.classList.remove("hidden");

      this.bindClick(
        "game-over-continue-btn",
        () => {
          this.hideGameOverModal();
          onContinue();
        },
        continueButton,
        HTMLButtonElement,
      );
      return;
    }

    console.error("Game Over modal elements not found.");
    this.notificationService.success(`${modalTitleText}: ${modalMessageText}`);
    onContinue();
  }

  private hideGameOverModal(): void {
    const modalElements = this.getGameOverModalElements();
    if (modalElements) {
      modalElements.modal.classList.add("hidden");
    }
    this.clearEventListenersForId("game-over-continue-btn", "click");
  }

  private clearEventListenersForId(elementId: string, eventType: string): void {
    this.eventListeners = this.eventListeners.filter((listener) => {
      if (listener.element.id === elementId && listener.event === eventType) {
        listener.element.removeEventListener(listener.event, listener.handler);
        return false;
      }
      return true;
    });
  }

  private async ensureCurrentUser(): Promise<PublicUser | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    if (!this.currentUserPromise) {
      this.currentUserPromise = AuthService.getCurrentUser()
        .then((user) => {
          this.currentUser = user;
          return user;
        })
        .catch((error) => {
          console.error("Failed to fetch current user:", error);
          return null;
        });
    }

    return this.currentUserPromise;
  }

  private getRoundLabel(roundNumber: number): string {
    const rounds = this.t.rounds || {};
    const tournament = this.tournamentData.getCurrentTournament();
    const totalRounds =
      tournament && tournament.playerCount > 1
        ? Math.round(Math.log2(tournament.playerCount))
        : null;

    if (totalRounds) {
      if (roundNumber === totalRounds && rounds.final) {
        return rounds.final;
      }
      if (roundNumber === totalRounds - 1 && rounds.semiFinal) {
        return rounds.semiFinal;
      }
      if (roundNumber === totalRounds - 2 && rounds.quarterFinal) {
        return rounds.quarterFinal;
      }
    }

    const template = rounds.round || "Round {{number}}";
    return template.replace("{{number}}", roundNumber.toString());
  }

  private async recordTournamentMatchHistory(
    match: TournamentMatch,
    score: { player1: number; player2: number },
    winnerId: string,
  ): Promise<void> {
    try {
      const currentUser = await this.ensureCurrentUser();
      if (!currentUser) return;

      const player1 = this.tournamentData.getPlayer(match.player1Id);
      const player2 = this.tournamentData.getPlayer(match.player2Id);
      if (!player1 || !player2) return;

      let perspective: {
        player: TournamentPlayer;
        opponent: TournamentPlayer;
        index: 1 | 2;
      } | null = null;

      if (player1.userId === currentUser.id) {
        perspective = { player: player1, opponent: player2, index: 1 };
      } else if (player2.userId === currentUser.id) {
        perspective = { player: player2, opponent: player1, index: 2 };
      } else {
        return;
      }

      const myScore = perspective.index === 1 ? score.player1 : score.player2;
      const opponentScore =
        perspective.index === 1 ? score.player2 : score.player1;

      const tournament = this.tournamentData.getCurrentTournament();

      await HistoryService.saveGame({
        userId: currentUser.id,
        tournamentId: null,
        teammate: null,
        myScore,
        opponentScore,
        isWinner: perspective.player.id === winnerId,
        opponentInfo: perspective.opponent.alias,
        finishedAt: new Date().toISOString(),
        matchType: "tournament",
        tournamentRound: this.getRoundLabel(match.round),
        tournamentName: tournament?.name ?? null,
      });
    } catch (error) {
      console.error("Failed to record tournament match history:", error);
    }
  }
}
