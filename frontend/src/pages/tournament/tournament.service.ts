import { GameManagerService } from "../../shared/services/game-manager.service";
import { NotificationService } from "../../shared/services/notification.service";
import { router } from "../../routes/router";
import { TournamentDataService } from "../../shared/services/tournament-data.service";
import { GameSetupUI } from "../../shared/components/game-setup-ui";
import { PlayerRegistrationManager } from "../../shared/components/player-registration-manager";
import { translate } from "../../i18n";

export type TournamentStep =
  | "setup"
  | "registration"
  | "bracket"
  | "match"
  | "results";

/**
 * TournamentService - トーナメント機能の管理
 */
export class TournamentService {
  private currentStep: TournamentStep = "setup";
  private currentPath: string = "/tournament";
  private gameManager: GameManagerService;
  private tournamentData: TournamentDataService;
  private notificationService: NotificationService;
  private gameSetupUI: GameSetupUI;
  private playerRegistrationManager: PlayerRegistrationManager;
  private eventListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

  constructor() {
    this.gameManager = new GameManagerService();
    this.tournamentData = TournamentDataService.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.gameSetupUI = new GameSetupUI();
    this.playerRegistrationManager = new PlayerRegistrationManager();
  }

  setCurrentPath(path: string): void {
    this.currentPath = path;
    this.determineStepFromPath(path);
  }

  private determineStepFromPath(path: string): void {
    if (path === "/tournament" || path === "/tournament/") {
      this.currentStep = "setup";
    } else if (path === "/tournament/registration") {
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
    const container = document.getElementById("tournament-content");
    if (!container) return;

    this.clearEventListeners();

    switch (this.currentStep) {
      case "setup":
        this.renderSetupView(container);
        break;
      case "registration":
        await this.renderRegistrationView(container);
        break;
      case "bracket":
        this.renderBracketView(container);
        break;
      case "match":
        this.renderMatchView(container);
        break;
      case "results":
        this.renderResultsView(container);
        break;
    }
  }

  private renderSetupView(container: HTMLElement): void {
    const setupFormHtml = this.gameSetupUI.getTemplate({
      showNameInput: true,
      nameInputId: "tournament-name",
      nameLabel: translate("tournament.setup.nameLabel"),
      namePlaceholder: translate("tournament.setup.namePlaceholder"),
      nameDefaultValue: translate("tournament.setup.nameDefault"),
      selectId: "player-count",
      selectLabel: translate("tournament.setup.playerCountLabel"),
      options: [2, 4, 8].map((count) => ({
        value: String(count),
        text: translate("tournament.setup.playerOption", { count }),
      })),
      buttonId: "create-tournament",
      buttonText: translate("tournament.buttons.create"),
      buttonClasses:
        "w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded border border-blue-400 shadow-lg",
    });

    container.innerHTML = `
      <div class="max-w-xs mx-auto flex flex-col items-center space-y-3">
        ${setupFormHtml}
        
        </div>
    `;

    this.attachEventListenerSafely("create-tournament", "click", () =>
      this.createTournament(),
    );
  }

  private createTournament(): void {
    const playerCountSelect = document.getElementById("player-count");
    const tournamentNameInput = document.getElementById("tournament-name");

    if (!playerCountSelect || !tournamentNameInput) {
      console.error("Required tournament setup elements not found");
      return;
    }

    const playerCount = parseInt(
      (playerCountSelect as HTMLSelectElement).value,
      10,
    );
    const tournamentName = (
      tournamentNameInput as HTMLInputElement
    ).value.trim();

    if (!tournamentName) {
      alert(translate("tournament.setup.missingName"));
      return;
    }

    this.tournamentData.createTournament(tournamentName, playerCount);
    this.navigateToRegistration();
  }

  private async renderRegistrationView(container: HTMLElement): Promise<void> {
    const tournament = this.tournamentData.getCurrentTournament();
    if (!tournament) {
      this.navigateToSetup();
      return;
    }

    const backToSetupLabel = translate("tournament.buttons.backToSetup");
    const startTournamentLabel = translate(
      "tournament.buttons.startTournament",
    );
    const registrationTitle = translate("tournament.registration.title");
    const registrationSubtitle = translate("tournament.registration.subtitle", {
      name: tournament.name,
      count: tournament.playerCount,
    });

    const registrationContainer = document.createElement("div");
    container.innerHTML = `
      <div class="flex space-x-4">
        <button
          id="back-to-setup"
          class="flex-1 bg-purple-400 hover:bg-purple-600 text-white py-2 px-4 rounded border border-purple-400 shadow-lg"
        >
          ${backToSetupLabel}
        </button>
        <button
          id="start-tournament"
          class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded border border-green-400 shadow-lg"
          disabled
        >
          ${startTournamentLabel}
        </button>
      </div>
    `;

    container.insertBefore(registrationContainer, container.firstChild);

    try {
      await this.playerRegistrationManager.render({
        container: registrationContainer,
        playerCount: tournament.playerCount,
        title: registrationTitle,
        subtitle: registrationSubtitle,
        startButtonId: "start-tournament",
        requireHumanPlayer: true,
      });
    } catch (error) {
      console.error("Failed to render registration view:", error);
      this.notificationService.error(
        translate("tournament.registration.error"),
      );
      this.navigateToSetup();
      return;
    }

    this.attachEventListenerSafely("back-to-setup", "click", () => {
      // セットアップ画面に戻る時はトーナメントデータをクリア
      this.tournamentData.clearTournament();
      this.navigateToSetup();
    });

    this.attachEventListenerSafely("start-tournament", "click", () =>
      this.startTournament(),
    );
  }

  private startTournament(): void {
    console.log("Starting tournament...");

    // バリデーションチェック
    if (!this.playerRegistrationManager.isValid()) {
      return;
    }
    const tournament = this.tournamentData.getCurrentTournament();
    if (!tournament) {
      console.error("No tournament found");
      return;
    }

    // 既存のプレイヤーとマッチをクリアして新しく開始
    tournament.players = [];
    tournament.matches = [];
    tournament.currentRound = 1;
    tournament.status = "setup";

    const playerSelections =
      this.playerRegistrationManager.getPlayerSelections();
    if (!playerSelections || !Array.isArray(playerSelections)) {
      console.error("Invalid player selections");
      this.notificationService.error(
        translate("tournament.errors.playerSelection"),
      );
      return;
    }
    console.log("Found player selections:", playerSelections.length);

    playerSelections.forEach((selection) => {
      if (selection) {
        console.log("Adding player:", selection);
        this.tournamentData.addPlayerFromSelection(selection);
      }
    });

    try {
      console.log("Generating matches...");
      this.tournamentData.generateMatches();
      console.log("Matches generated, navigating to bracket...");
      this.navigateToBracket();
    } catch (error) {
      console.error("Error generating matches:", error);
      alert(
        translate("tournament.errors.startTournament", {
          message: (error as Error).message,
        }),
      );
    }
  }

  // Navigation methods
  navigateToSetup(): void {
    this.navigate("/tournament");
  }

  navigateToRegistration(): void {
    this.navigate("/tournament/registration");
  }

  navigateToBracket(): void {
    this.navigate("/tournament/bracket");
  }

  private navigate(path: string): void {
    router.navigate(path);
  }

  getPageTitle(): string {
    switch (this.currentStep) {
      case "setup":
        return translate("tournament.titles.setup");
      case "registration":
        return translate("tournament.titles.registration");
      case "bracket":
        return translate("tournament.titles.bracket");
      case "match":
        return translate("tournament.titles.match");
      case "results":
        return translate("tournament.titles.results");
      default:
        return translate("tournament.titles.mode");
    }
  }

  getBackButtonTemplate(): string {
    const backText =
      this.currentStep === "setup" || this.currentStep === "registration"
        ? translate("tournament.buttons.home")
        : translate("tournament.buttons.back");
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
    this.playerRegistrationManager.destroy();
  }

  cleanup(): void {
    this.clearEventListeners();
    this.gameManager.cleanup();
  }

  private renderBracketView(container: HTMLElement): void {
    const tournament = this.tournamentData.getCurrentTournament();
    if (!tournament) {
      this.navigateToSetup();
      return;
    }

    // 現在のラウンドのマッチのみ表示
    const currentRoundMatches = this.tournamentData.getCurrentRoundMatches();
    const unknownPlayerLabel = translate("tournament.bracket.unknownPlayer");
    const vsLabel = translate("tournament.bracket.vs");
    const playLabel = translate("tournament.buttons.playMatch");
    const playingLabel = translate("tournament.buttons.playing");
    const newTournamentLabel = translate("tournament.buttons.newTournament");

    const matchesHtml = currentRoundMatches
      .map((match) => {
        const player1 = this.tournamentData.getPlayer(match.player1Id);
        const player2 = this.tournamentData.getPlayer(match.player2Id);
        const player1Name = this.escapeHtml(
          player1?.alias || unknownPlayerLabel,
        );
        const player2Name = this.escapeHtml(
          player2?.alias || unknownPlayerLabel,
        );

        return `
        <div class="bg-black bg-opacity-30 p-4 rounded border border-cyan-400 border-opacity-50">
          <div class="flex justify-between items-center">
            <div class="text-center flex-1">
              <div class="font-semibold text-white">${player1Name}</div>
              ${match.score ? `<div class="text-sm text-gray-600">${match.score.player1}</div>` : ""}
            </div>
            <div class="mx-4 text-gray-300">${vsLabel}</div>
            <div class="text-center flex-1">
              <div class="font-semibold text-white">${player2Name}</div>
              ${match.score ? `<div class="text-sm text-gray-600">${match.score.player2}</div>` : ""}
            </div>
            <div class="ml-4">
              ${
                match.status === "pending"
                  ? `<button data-match-id="${match.id}" class="play-match-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">${playLabel}</button>`
                  : match.status === "completed"
                    ? `<span class="text-green-600 font-semibold">✓</span>`
                    : `<span class="text-blue-600">${playingLabel}</span>`
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
    const heading = translate("tournament.bracket.heading");
    const remainingText = translate("tournament.bracket.remaining", {
      roundName,
      count: remainingPlayers,
    });

    container.innerHTML = `
      <div class="text-center mb-4">
        <h3 class="text-xl font-bold">${heading}</h3>
        <p class="text-gray-300">${remainingText}</p>
      </div>
      
      <div class="space-y-4 mb-6">
        ${matchesHtml}
      </div>
      
      <div class="text-center">
        <button id="new-tournament-btn" class="bg-purple-400 hover:bg-purple-600 text-white px-6 py-2 rounded">
          ${newTournamentLabel}
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
      this.navigateToSetup();
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
    const player1Display =
      player1?.alias ||
      translate("tournament.match.playerDefault", { index: 1 });
    const player2Display =
      player2?.alias ||
      translate("tournament.match.playerDefault", { index: 2 });
    const player1Name = this.escapeHtml(player1Display);
    const player2Name = this.escapeHtml(player2Display);
    const heading = translate("tournament.match.heading", {
      player1: player1Name,
      player2: player2Name,
    });
    const matchIdSafe = this.escapeHtml(matchId);
    const details = translate("tournament.match.details", { id: matchIdSafe });
    const startMatchLabel = translate("tournament.buttons.startMatch");
    const pauseLabel = translate("tournament.buttons.pause");
    const resetLabel = translate("tournament.buttons.reset");
    const controlsLeft = translate("tournament.match.controlsLeft", {
      player: player1Name,
    });
    const controlsRight = translate("tournament.match.controlsRight", {
      player: player2Name,
    });

    container.innerHTML = `
      <!-- コンパクトなヘッダー -->
      <div class="text-center mb-2">
        <h3 class="text-lg font-medium text-white">${heading}</h3>
        <p class="text-sm text-gray-400">${details}</p>
      </div>

      <!-- コンパクトなボタン -->
      <div class="mb-2 text-center">
        <div class="space-x-2">
          <button id="start-tournament-game" class="bg-green-500 hover:bg-green-600 text-white px-4 py-1 text-sm rounded">
            ${startMatchLabel}
          </button>
          <button id="pause-tournament-game" class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1 text-sm rounded" disabled>
            ${pauseLabel}
          </button>
          <button id="reset-tournament-game" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 text-sm rounded">
            ${resetLabel}
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
      this.navigateToSetup();
      return;
    }

    const title = translate("tournament.results.title");
    const winnerText = translate("tournament.results.winner", {
      name: this.escapeHtml(winner.alias),
    });
    const recordText = translate("tournament.results.record", {
      wins: winner.wins,
      losses: winner.losses,
    });
    const newTournamentLabel = translate(
      "tournament.buttons.startNewTournament",
    );

    container.innerHTML = `
      <div class="text-center">
        <h3 class="text-2xl font-bold mb-4 text-white">${title}</h3>
        <div class="bg-yellow-50 bg-opacity-10 p-6 rounded-lg mb-6 border border-yellow-400">
          <h4 class="text-xl font-semibold text-yellow-300">${winnerText}</h4>
          <p class="text-yellow-200">${recordText}</p>
        </div>
        
        <div class="space-y-2">
          <button id="new-tournament" class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded">
            ${newTournamentLabel}
          </button>
        </div>
      </div>
    `;

    this.attachEventListenerSafely("new-tournament", "click", () => {
      this.tournamentData.clearTournament();
      this.navigateToSetup();
    });
  }

  private getRoundName(currentRound: number, totalPlayers: number): string {
    const totalRounds = Math.log2(totalPlayers);

    if (currentRound === totalRounds) {
      return translate("tournament.rounds.final");
    } else if (currentRound === totalRounds - 1) {
      return translate("tournament.rounds.semiFinal");
    } else if (currentRound === totalRounds - 2) {
      return translate("tournament.rounds.quarterFinal");
    } else {
      return translate("tournament.rounds.round", { number: currentRound });
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
        this.tournamentData.clearTournament();
        this.navigate("/");
        break;
      case "bracket":
        this.navigateToRegistration();
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

    const startBtn = document.getElementById(
      "start-tournament-game",
    ) as HTMLButtonElement;
    const pauseBtn = document.getElementById(
      "pause-tournament-game",
    ) as HTMLButtonElement;

    this.attachEventListenerSafely("start-tournament-game", "click", () => {
      this.gameManager.startGame();
      if (startBtn) startBtn.disabled = true;
      if (pauseBtn) pauseBtn.disabled = false;
    });

    this.attachEventListenerSafely("pause-tournament-game", "click", () => {
      this.gameManager.pauseGame();
      if (startBtn) startBtn.disabled = false;
      if (pauseBtn) pauseBtn.disabled = true;
    });

    this.attachEventListenerSafely("reset-tournament-game", "click", () => {
      this.gameManager.resetGame();
      if (startBtn) startBtn.disabled = false;
      if (pauseBtn) pauseBtn.disabled = true;
    });
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
      const winnerAlias =
        winnerPlayer?.alias ||
        translate("tournament.match.playerDefault", { index: winner });
      const modalTitle = translate("tournament.modal.playerWins", {
        index: winner,
      });
      const modalMessage = translate("tournament.modal.matchResult", {
        player: this.escapeHtml(winnerAlias),
        score1: score.player1,
        score2: score.player2,
      });

      this.showGameOverModal(modalTitle, modalMessage, () => {
        console.log("Continue button clicked. Checking tournament state...");
        if (this.tournamentData.isTournamentComplete()) {
          console.log("Tournament completed, navigating to results.");
          this.notificationService.success(
            translate("tournament.notifications.tournamentComplete"),
          );
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
              : translate("tournament.rounds.round", {
                  number: currentRound,
                });
            this.notificationService.info(
              translate("tournament.notifications.roundBegins", {
                roundName,
              }),
            );
          }
          this.navigateToBracket();
        } else {
          console.log("Current round not finished. Navigating to bracket.");
          this.navigateToBracket();
        }
      });

      const startBtn = document.getElementById(
        "start-tournament-game",
      ) as HTMLButtonElement;
      const pauseBtn = document.getElementById(
        "pause-tournament-game",
      ) as HTMLButtonElement;
      if (startBtn && pauseBtn) {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
      }
    } catch (error) {
      console.error("Error in handleMatchEnd:", error);
      this.notificationService.error(
        translate("tournament.errors.criticalMatch"),
      );
      this.navigateToBracket();
    }
  }

  private showGameOverModal(
    title: string,
    message: string,
    onContinue: () => void,
  ): void {
    const modal = document.getElementById("game-over-modal");
    const modalTitle = document.getElementById("game-over-title");
    const modalMessage = document.getElementById("game-over-message");
    const continueBtn = document.getElementById("game-over-continue-btn");

    if (modal && modalTitle && modalMessage && continueBtn) {
      modalTitle.textContent = title;
      modalMessage.textContent = message;
      modal.classList.remove("hidden");

      this.clearEventListenersForId("game-over-continue-btn", "click");

      this.attachEventListenerSafely("game-over-continue-btn", "click", () => {
        this.hideGameOverModal();
        onContinue();
      });
    } else {
      console.error("Game Over modal elements not found.");
      this.notificationService.success(`${title}: ${message}`);
      onContinue();
    }
  }

  private hideGameOverModal(): void {
    const modal = document.getElementById("game-over-modal");
    if (modal) {
      modal.classList.add("hidden");
      this.clearEventListenersForId("game-over-continue-btn", "click");
    }
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
