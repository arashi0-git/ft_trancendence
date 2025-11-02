import { GameManagerService } from "../../shared/services/game-manager.service";
import { NotificationService } from "../../shared/services/notification.service";
import { router } from "../../routes/router";
import { TournamentDataService } from "../../shared/services/tournament-data.service";
import { PlayerRegistrationWithCountSelector } from "../../shared/components/player-registration-with-count-selector";
import { onLanguageChange, translate } from "../../i18n";

export type TournamentStep = "registration" | "bracket" | "match" | "results";

type ViewRenderer = (container: HTMLElement) => void | Promise<void>;

type TranslateFn = (key: string, options?: Record<string, unknown>) => unknown;

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

/**
 * TournamentService - トーナメント機能の管理
 */
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
  private t: Record<string, any>;
  private contentContainer: HTMLElement | null = null;
  private cachedGameOverModal: GameOverModalElements | null = null;
  private eventListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

  constructor(translateFn?: TranslateFn) {
    this.gameManager = new GameManagerService();
    this.tournamentData = TournamentDataService.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.playerRegistrationWithCountSelector =
      new PlayerRegistrationWithCountSelector();
    this.translateFn = translateFn ?? translate;
    const translator = this.translateFn;
    this.t = translator
      ? (translator("tournament", { returnObjects: true }) as Record<
          string,
          any
        >)
      : {};
    this.navigationCopy = this.buildNavigationCopy();
    this.viewRenderers = {
      registration: this.renderRegistrationView.bind(this),
      bracket: this.renderBracketView.bind(this),
      match: this.renderMatchView.bind(this),
      results: this.renderResultsView.bind(this),
    };
    onLanguageChange(this.handleLanguageChange.bind(this));
  }

  setCurrentPath(path: string): void {
    this.currentPath = path;
    this.determineStepFromPath(path);
  }

  private handleLanguageChange(): void {
    const translator = this.translateFn;

    this.t = translator
      ? (translator("tournament", { returnObjects: true }) as Record<
          string,
          any
        >)
      : {};

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
    const errors = this.t.errors || {};
    const playerSelector = this.t.playerSelector || {};
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
        requireHumanPlayer: true,
        translations: {
          setup: setup,
          playerSelector: playerSelector,
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
            console.error("Error generating matches:", error);
            const errorMessageTemplate =
              errors.startTournament ||
              "Failed to generate matches: {{message}}";
            const message =
              error instanceof Error && error.message ? error.message : "";
            this.notificationService.error(
              errorMessageTemplate.replace("{{message}}", message),
            );
          }
        },
      });
    } catch (error) {
      console.error("Failed to render registration view:", error);
      this.notificationService.error(
        reg.error || "Failed to render registration view",
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
    const stepCopy =
      this.navigationCopy[this.currentStep] ?? this.navigationCopy.fallback;
    return stepCopy.pageTitle;
  }

  getBackButtonTemplate(): string {
    if (this.currentStep === "registration") {
      return "";
    }

    const stepCopy =
      this.navigationCopy[this.currentStep] ?? this.navigationCopy.fallback;
    const backText = stepCopy.backButtonLabel;
    return `<button id="back-button" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded border border-purple-400">${backText}</button>`;
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
    this.contentContainer = null;
    this.cachedGameOverModal = null;
  }

  private renderBracketView(container: HTMLElement): void {
    const tournament = this.tournamentData.getCurrentTournament();
    if (!tournament) {
      router.navigate("/tournament");
      return;
    }

    // 現在のラウンドのマッチのみ表示
    const currentRoundMatches = this.tournamentData.getCurrentRoundMatches();
    const matchesHtml = currentRoundMatches
      .map((match) => {
        const player1 = this.tournamentData.getPlayer(match.player1Id);
        const player2 = this.tournamentData.getPlayer(match.player2Id);

        return `
        <div class="bg-black bg-opacity-30 p-4 rounded border border-cyan-400 border-opacity-50">
          <div class="flex justify-between items-center">
            <div class="text-center flex-1">
              <div class="font-semibold text-white">${this.escapeHtml(player1?.alias || "Unknown")}</div>
              ${match.score ? `<div class="text-sm text-gray-600">${match.score.player1}</div>` : ""}
            </div>
            <div class="mx-4 text-gray-300">VS</div>
            <div class="text-center flex-1">
              <div class="font-semibold text-white">${this.escapeHtml(player2?.alias || "Unknown")}</div>
              ${match.score ? `<div class="text-sm text-gray-600">${match.score.player2}</div>` : ""}
            </div>
            <div class="ml-4">
              ${
                match.status === "pending"
                  ? `<button data-match-id="${match.id}" class="play-match-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">Play</button>`
                  : match.status === "completed"
                    ? `<span class="text-green-600 font-semibold">✓</span>`
                    : `<span class="text-blue-600">Playing...</span>`
              }
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    const totalPlayers = tournament.players.length;
    const remainingPlayers = currentRoundMatches.length * 2;
    const roundName = this.getRoundName(tournament.currentRound, totalPlayers);

    container.innerHTML = `
      <div class="text-center mb-4">
        <h3 class="text-xl font-bold">Current Bracket</h3>
        <p class="text-gray-300">${roundName} (${remainingPlayers} players remaining)</p>
      </div>
      
      <div class="space-y-4 mb-6">
        ${matchesHtml}
      </div>
      
      <div class="text-center">
        <button id="new-tournament-btn" class="bg-purple-400 hover:bg-purple-600 text-white px-6 py-2 rounded">
          New Tournament
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

    const player1 = this.tournamentData.getPlayer(match.player1Id);
    const player2 = this.tournamentData.getPlayer(match.player2Id);

    container.innerHTML = `
      <!-- コンパクトなヘッダー -->
      <div class="text-center mb-2">
        <h3 class="text-lg font-medium text-white">${this.escapeHtml(player1?.alias || "Player 1")} vs ${this.escapeHtml(player2?.alias || "Player 2")}</h3>
        <p class="text-sm text-gray-400">Match ${this.escapeHtml(matchId)} - First to 5 points wins</p>
      </div>

      <!-- コンパクトなボタン -->
      <div class="mb-2 text-center">
        <div class="space-x-2">
          <button id="start-tournament-game" class="bg-green-500 hover:bg-green-600 text-white px-4 py-1 text-sm rounded">
            Start Match
          </button>
          <button id="pause-tournament-game" class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1 text-sm rounded" disabled>
            Pause
          </button>
          <button id="reset-tournament-game" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 text-sm rounded">
            Reset
          </button>
        </div>
      </div>
      
      <!-- 大きなゲームフィールド -->
      <div class="flex justify-center mb-2 w-full">
        <canvas id="tournament-pong-canvas" class="border-2 border-gray-300 bg-black rounded-lg shadow-lg max-w-full max-h-[80vh]" style="width: 100%; height: auto;"></canvas>
      </div>
      
      <!-- コンパクトなコントロール説明 -->
      <div class="text-center text-xs text-gray-400">
        <p><strong>${this.escapeHtml(player1?.alias || "Player 1")}:</strong> W/S (Up/Down), A/D (Left/Right)</p>
        <p><strong>${this.escapeHtml(player2?.alias || "Player 2")}:</strong> ↑/↓ (Up/Down), ←/→ (Left/Right)</p>
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

    container.innerHTML = `
      <div class="text-center">
        <h3 class="text-2xl font-bold mb-4 text-white">🏆 Tournament Complete!</h3>
        <div class="bg-yellow-50 bg-opacity-10 p-6 rounded-lg mb-6 border border-yellow-400">
          <h4 class="text-xl font-semibold text-yellow-300">Winner: ${this.escapeHtml(winner.alias)}</h4>
          <p class="text-yellow-200">Wins: ${winner.wins} | Losses: ${winner.losses}</p>
        </div>
        
        <div class="space-y-2">
          <button id="new-tournament" class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded">
            Start New Tournament
          </button>
        </div>
      </div>
    `;

    this.attachEventListenerSafely("new-tournament", "click", () => {
      this.tournamentData.clearTournament();
      router.navigate("/tournament");
    });
  }

  private getRoundName(currentRound: number, totalPlayers: number): string {
    const totalRounds = Math.log2(totalPlayers);

    if (currentRound === totalRounds) {
      return "Final";
    } else if (currentRound === totalRounds - 1) {
      return "Semi-Final";
    } else if (currentRound === totalRounds - 2) {
      return "Quarter-Final";
    } else {
      return `Round ${currentRound}`;
    }
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
        this.navigateToBracket();
        break;
      case "results":
        this.navigateToBracket();
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

      const winnerPlayer = this.tournamentData.getPlayer(winnerId);
      const winnerAlias = winnerPlayer?.alias || "Player";
      const modalTitle = winner === 1 ? "Player 1 Wins!" : "Player 2 Wins!";
      const modalMessage = `${winnerAlias} wins the match ${score.player1} - ${score.player2}!`;

      this.showGameOverModal(modalTitle, modalMessage, () => {
        console.log("Continue button clicked. Checking tournament state...");
        if (this.tournamentData.isTournamentComplete()) {
          console.log("Tournament completed, navigating to results.");
          this.notificationService.success("Tournament completed! 🏆");
          this.navigateToResults();
        } else if (this.tournamentData.canAdvanceToNextRound()) {
          console.log("Advancing to next round.");
          const success = this.tournamentData.generateNextRound();
          if (success) {
            const currentRound =
              this.tournamentData.getCurrentTournament()?.currentRound;
            const tournament = this.tournamentData.getCurrentTournament();
            const roundName = tournament
              ? this.getRoundName(currentRound || 1, tournament.players.length)
              : `Round ${currentRound}`;
            this.notificationService.info(`${roundName} begins! 🥊`);
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
      this.notificationService.error(
        "A critical error occurred while saving the match.",
      );
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
}
