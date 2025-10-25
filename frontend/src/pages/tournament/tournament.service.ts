import { AuthService } from "../../shared/services/auth-service";
import { GameManagerService } from "../../shared/services/game-manager.service";
import { NotificationService } from "../../shared/services/notification.service";
import { router } from "../../routes/router";
import { TournamentDataService } from "../../shared/services/tournament-data.service";

export type TournamentStep =
  | "setup"
  | "registration"
  | "bracket"
  | "match"
  | "results";

/**
 * TournamentService - トーナメント機能の管理
 *
 * 重要: イベントリスナーの管理について
 * - 直接的な addEventListener の使用は禁止
 * - 必ず attachEventListenerSafely または addEventListenerWithTracking を使用
 * - これによりメモリリークを防止し、適切なクリーンアップを保証
 */
export class TournamentService {
  private currentStep: TournamentStep = "setup";
  private currentPath: string = "/tournament";
  private gameManager: GameManagerService;
  private tournamentData: TournamentDataService;
  private notificationService: NotificationService;
  private eventListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

  constructor() {
    this.gameManager = new GameManagerService();
    this.tournamentData = TournamentDataService.getInstance();
    this.notificationService = NotificationService.getInstance();
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

  initializeCurrentView(): void {
    const container = document.getElementById("tournament-content");
    if (!container) return;

    // 新しいビューをレンダリングする前に既存のイベントリスナーをクリーンアップ
    this.clearEventListeners();

    switch (this.currentStep) {
      case "setup":
        this.renderSetupView(container);
        break;
      case "registration":
        this.renderRegistrationView(container);
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
    container.innerHTML = `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-white mb-2">Number of Players</label>
          <select id="player-count" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="2">2 Players</option>
            <option value="4">4 Players</option>
            <option value="8">8 Players</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-white mb-2">Tournament Name</label>
          <input
            type="text"
            id="tournament-name"
            placeholder="Enter tournament name"
            value="Pong Tournament"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
        </div>

        <button
          id="create-tournament"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded border border-blue-400 shadow-lg"
        >
          Create Tournament
        </button>
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
      alert("トーナメント名を入力してください");
      return;
    }

    this.tournamentData.createTournament(tournamentName, playerCount);
    this.navigateToRegistration();
  }

  private renderRegistrationView(container: HTMLElement): void {
    const tournament = this.tournamentData.getCurrentTournament();
    if (!tournament) {
      this.navigateToSetup();
      return;
    }

    container.innerHTML = `
      <div class="text-center mb-4">
        <h3 class="text-lg font-semibold">Enter Player Aliases</h3>
        <p class="text-sm text-gray-300">Tournament: ${this.escapeHtml(tournament.name)} (${tournament.playerCount} players)</p>
      </div>

      <div id="player-inputs" class="space-y-3 mb-4">
        <!-- プレイヤー入力フィールド生成 -->
      </div>

      <div class="flex space-x-4">
        <button
          id="back-to-setup"
          class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded border border-purple-400 shadow-lg"
        >
          Back to Setup
        </button>
        <button
          id="start-tournament"
          class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded border border-green-400 shadow-lg"
          disabled
        >
          Start Tournament
        </button>
      </div>
    `;

    this.generatePlayerInputs(tournament.playerCount);

    this.attachEventListenerSafely("back-to-setup", "click", () =>
      this.navigateToSetup(),
    );

    this.attachEventListenerSafely("start-tournament", "click", () =>
      this.startTournament(),
    );
  }

  private generatePlayerInputs(playerCount: number): void {
    const playerInputsContainer = document.getElementById("player-inputs");
    if (!playerInputsContainer) return;

    playerInputsContainer.innerHTML = "";

    for (let i = 1; i <= playerCount; i++) {
      const inputDiv = document.createElement("div");
      inputDiv.innerHTML = `
        <label class="block text-sm font-medium text-white mb-1">Player ${i} Alias</label>
        <input
          type="text"
          id="player-${i}-alias"
          placeholder="Enter alias for Player ${i}"
          maxlength="20"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
      `;
      playerInputsContainer.appendChild(inputDiv);

      const input = inputDiv.querySelector("input") as HTMLInputElement;
      if (input) {
        this.addEventListenerWithTracking(input, "input", () =>
          this.validatePlayerInputs(),
        );
      }
    }
  }

  private validatePlayerInputs(): void {
    const startBtn = document.getElementById(
      "start-tournament",
    ) as HTMLButtonElement;
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

  private startTournament(): void {
    const tournament = this.tournamentData.getCurrentTournament();
    if (!tournament) return;

    const inputs = document.querySelectorAll(
      "#player-inputs input",
    ) as NodeListOf<HTMLInputElement>;

    // プレイヤーを追加
    inputs.forEach((input) => {
      this.tournamentData.addPlayer(input.value.trim());
    });

    // マッチを生成
    this.tournamentData.generateMatches();

    this.navigateToBracket();
  }

  private renderBracketView(container: HTMLElement): void {
    const tournament = this.tournamentData.getCurrentTournament();
    if (!tournament) {
      this.navigateToSetup();
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
        <button id="new-tournament-btn" class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded">
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

    container.innerHTML = `
      <div class="text-center mb-4">
        <h3 class="text-xl font-semibold text-white">${this.escapeHtml(player1?.alias || "Player 1")} vs ${this.escapeHtml(player2?.alias || "Player 2")}</h3>
        <p class="text-gray-300">Match ${this.escapeHtml(matchId)} - First to 5 points wins</p>
      </div>

      <div class="mb-4 text-center">
        <div class="space-x-4">
          <button id="start-tournament-game" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded">
            Start Match
          </button>
          <button id="pause-tournament-game" class="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded" disabled>
            Pause
          </button>
          <button id="reset-tournament-game" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded">
            Reset
          </button>
        </div>
      </div>
      
      <div class="flex justify-center mb-4">
        <canvas id="tournament-pong-canvas" class="border-2 border-gray-300 bg-black"></canvas>
      </div>
      
      <div class="text-center text-sm text-gray-300">
        <p><strong>${this.escapeHtml(player1?.alias || "Player 1")}:</strong> W/S (Up/Down), A/D (Left/Right)</p>
        <p><strong>${this.escapeHtml(player2?.alias || "Player 2")}:</strong> ↑/↓ (Up/Down), ←/→ (Left/Right)</p>
      </div>
    `;

    this.initializeMatchGame(matchId);
  }

  private initializeMatchGame(matchId: string): void {
    console.log(
      `%c[Tournament] Initializing Match: ${matchId}`,
      "color: blue; font-weight: bold;",
    );

    this.gameManager.cleanup();
    this.gameManager.initializeGame({
      mode: "tournament",
      canvasId: "tournament-pong-canvas",
      onGameEnd: (data: { winner: number; score1: number; score2: number }) => {
        console.log(
          `%c[Tournament] Match Ended: ${matchId}`,
          "color: green; font-weight: bold;",
          "Data:",
          data,
        );
        this.handleMatchEnd(matchId, data.winner, {
          player1: data.score1,
          player2: data.score2,
        });
      },
    });

    // ゲームコントロールボタンの設定 (zbytek funkce zůstává stejný)
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
    console.log(
      `%c[Tournament] Handling Match End: ${matchId}`,
      "color: green; font-weight: bold;",
    );

    try {
      const match = this.tournamentData.getMatch(matchId);
      if (!match) {
        console.error(
          `[Tournament] CRITICAL: Match ${matchId} not found in handleMatchEnd.`,
        );
        return;
      }

      console.log("[Tournament] Completing match...");
      const winnerId = winner === 1 ? match.player1Id : match.player2Id;
      this.tournamentData.completeMatch(matchId, winnerId, score);

      const winnerPlayer = this.tournamentData.getPlayer(winnerId);
      const winnerAlias = winnerPlayer?.alias || "Player";

      // ===================================
      // OPRAVA: Místo notifikace a setTimeout
      // zobrazíme modál
      // ===================================
      const modalTitle = winner === 1 ? "Player 1 Wins!" : "Player 2 Wins!";
      const modalMessage = `${winnerAlias} wins the match ${score.player1} - ${score.player2}!`;

      this.showGameOverModal(modalTitle, modalMessage, () => {
        // Tato funkce se spustí, když uživatel klikne na "Continue"
        console.log(
          "[Tournament] Continue button clicked. Checking tournament state...",
        );
        if (this.tournamentData.isTournamentComplete()) {
          console.log("[Tournament] Navigating to results.");
          this.notificationService.success("Tournament completed! 🏆"); // Může zůstat pro celkový závěr
          this.navigateToResults();
        } else if (this.tournamentData.canAdvanceToNextRound()) {
          console.log("[Tournament] Advancing to next round.");
          const success = this.tournamentData.generateNextRound();
          if (success) {
            const currentRound =
              this.tournamentData.getCurrentTournament()?.currentRound;
            const tournament = this.tournamentData.getCurrentTournament();
            const roundName = tournament
              ? this.getRoundName(currentRound || 1, tournament.players.length)
              : `Round ${currentRound}`;
            this.notificationService.info(`${roundName} begins! 🥊`); // Informace o novém kole
          }
          this.navigateToBracket();
        } else {
          console.log(
            "[Tournament] Current round not finished. Navigating to bracket.",
          );
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
      console.error(
        "%c[Tournament] FATAL ERROR in handleMatchEnd:",
        "color: red; font-size: 20px;",
        error,
      );
      this.notificationService.error(
        "A critical error occurred while saving the match.",
      );
      this.navigateToBracket();
    }
  }

  private renderResultsView(container: HTMLElement): void {
    const tournament = this.tournamentData.getCurrentTournament();
    const winner = this.tournamentData.getTournamentWinner();

    if (!tournament || !winner) {
      this.navigateToSetup();
      return;
    }

    container.innerHTML = `
      <div class="text-center">
        <h3 class="text-2xl font-bold mb-4">🏆 Tournament Complete!</h3>
        <div class="bg-yellow-50 p-6 rounded-lg mb-6">
          <h4 class="text-xl font-semibold text-yellow-800">Winner: ${this.escapeHtml(winner.alias)}</h4>
          <p class="text-yellow-600">Wins: ${winner.wins} | Losses: ${winner.losses}</p>
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
      this.navigateToSetup();
    });
  }

  private extractMatchIdFromPath(): string {
    const parts = this.currentPath.split("/").filter(Boolean);
    return parts[parts.length - 1] || "unknown";
  }

  // ナビゲーションメソッド
  navigateToSetup(): void {
    this.navigate("/tournament");
  }

  navigateToRegistration(): void {
    this.navigate("/tournament/registration");
  }

  navigateToBracket(): void {
    this.navigate("/tournament/bracket");
  }

  navigateToMatch(matchId: string): void {
    this.navigate(`/tournament/match/${matchId}`);
  }

  navigateToResults(): void {
    this.navigate("/tournament/results");
  }

  navigateToHome(): void {
    this.navigate("/");
  }

  navigateToLogin(): void {
    this.navigate("/login");
  }

  private navigate(path: string): void {
    this.cleanup();
    router.navigate(path);
  }

  async handleLogout(): Promise<void> {
    try {
      await AuthService.logout();
      this.notificationService.success("ログアウトしました");
      this.navigateToHome();
    } catch (error) {
      console.error("ログアウトに失敗しました:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "ログアウト処理でエラーが発生しました";
      this.notificationService.error(`ログアウトエラー: ${errorMessage}`);

      // エラーが発生してもホームに戻る（ローカルトークンは既に削除済み）
      this.navigateToHome();
    }
  }

  handleBackNavigation(): void {
    switch (this.currentStep) {
      case "registration":
        this.navigateToSetup();
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
        this.navigateToHome();
    }
  }

  getPageTitle(): string {
    switch (this.currentStep) {
      case "setup":
        return "Tournament Setup";
      case "registration":
        return "Player Registration";
      case "bracket":
        return "Tournament Bracket";
      case "match":
        return "Tournament Match";
      case "results":
        return "Tournament Results";
      default:
        return "Tournament Mode";
    }
  }

  getBackButtonTemplate(): string {
    const backText = this.currentStep === "setup" ? "Home" : "Back";
    return `<button id="back-button" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded border border-purple-400">${backText}</button>`;
  }

  getAuthButtonTemplate(): string {
    return AuthService.isAuthenticated()
      ? `<button id="logout-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Logout</button>`
      : `<button id="login-tournament-btn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Login</button>`;
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

  /**
   * 安全なDOM要素取得とイベントリスナー追加のヘルパーメソッド
   * 要素が存在しない場合は警告を出力し、存在する場合は自動的にトラッキングを行う
   */
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

  /**
   * 複数要素への安全なイベントリスナー追加
   */
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

  private clearEventListeners(): void {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  cleanup(): void {
    this.clearEventListeners();
    this.gameManager.cleanup();
    this.hideGameOverModal();
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
      modal.classList.remove("hidden"); // Zobraz modál

      // Vyčistíme staré event listenery, pokud nějaké jsou
      this.clearEventListenersForId("game-over-continue-btn", "click");

      // Přidáme nový listener pro tlačítko Continue
      this.attachEventListenerSafely("game-over-continue-btn", "click", () => {
        this.hideGameOverModal(); // Skryj modál po kliknutí
        onContinue(); // Spusť akci po kliknutí
      });
    } else {
      console.error("Game Over modal elements not found.");
      // Záložní řešení, pokud modál selže
      this.notificationService.success(`${title}: ${message}`);
      onContinue();
    }
  }

  private hideGameOverModal(): void {
    const modal = document.getElementById("game-over-modal");
    if (modal) {
      modal.classList.add("hidden"); // Skryj modál
      this.clearEventListenersForId("game-over-continue-btn", "click"); // Vyčisti listener
    }
  }

  // Pomocná metoda pro čištění specifických listenerů
  private clearEventListenersForId(elementId: string, eventType: string): void {
    this.eventListeners = this.eventListeners.filter((listener) => {
      if (listener.element.id === elementId && listener.event === eventType) {
        listener.element.removeEventListener(listener.event, listener.handler);
        return false; // Odebereme z pole
      }
      return true; // Ponecháme ostatní
    });
  }
}
