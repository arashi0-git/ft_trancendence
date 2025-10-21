import { AuthService } from "../../shared/services/auth-service";
import { GameManagerService } from "../../shared/services/game-manager.service";
import {
  TournamentDataService,
  type TournamentData,
  type TournamentMatch,
  type TournamentPlayer,
} from "../../shared/services/tournament-data.service";

export type TournamentStep =
  | "setup"
  | "registration"
  | "bracket"
  | "match"
  | "results";

export class TournamentService {
  private currentStep: TournamentStep = "setup";
  private currentPath: string = "/tournament";
  private gameManager: GameManagerService;
  private tournamentData: TournamentDataService;

  constructor() {
    this.gameManager = new GameManagerService();
    this.tournamentData = TournamentDataService.getInstance();
  }

  setCurrentPath(path: string): void {
    this.currentPath = path;
    this.determineStepFromPath(path);
  }

  private determineStepFromPath(path: string): void {
    if (path === "/tournament" || path === "/tournament/") {
      this.currentStep = "setup";
    } else if (path === "/tournament/setup") {
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
          <label class="block text-sm font-medium text-gray-700 mb-2">Number of Players</label>
          <select id="player-count" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="2">2 Players</option>
            <option value="4">4 Players</option>
            <option value="8">8 Players</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tournament Name</label>
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
          class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        >
          Create Tournament
        </button>
      </div>
    `;

    document
      .getElementById("create-tournament")
      ?.addEventListener("click", () => {
        this.createTournament();
      });
  }

  private createTournament(): void {
    const playerCountSelect = document.getElementById(
      "player-count",
    ) as HTMLSelectElement;
    const tournamentNameInput = document.getElementById(
      "tournament-name",
    ) as HTMLInputElement;

    const playerCount = parseInt(playerCountSelect.value, 10);
    const tournamentName = tournamentNameInput.value.trim();

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
        <p class="text-sm text-gray-600">Tournament: ${tournament.name} (${tournament.playerCount} players)</p>
      </div>

      <div id="player-inputs" class="space-y-3 mb-4">
        <!-- プレイヤー入力フィールド生成 -->
      </div>

      <div class="flex space-x-4">
        <button
          id="back-to-setup"
          class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
        >
          Back to Setup
        </button>
        <button
          id="start-tournament"
          class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
          disabled
        >
          Start Tournament
        </button>
      </div>
    `;

    this.generatePlayerInputs(tournament.playerCount);

    document.getElementById("back-to-setup")?.addEventListener("click", () => {
      this.navigateToSetup();
    });

    document
      .getElementById("start-tournament")
      ?.addEventListener("click", () => {
        this.startTournament();
      });
  }

  private generatePlayerInputs(playerCount: number): void {
    const playerInputsContainer = document.getElementById("player-inputs");
    if (!playerInputsContainer) return;

    playerInputsContainer.innerHTML = "";

    for (let i = 1; i <= playerCount; i++) {
      const inputDiv = document.createElement("div");
      inputDiv.innerHTML = `
        <label class="block text-sm font-medium text-gray-700 mb-1">Player ${i} Alias</label>
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
      input.addEventListener("input", () => this.validatePlayerInputs());
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
        <div class="bg-gray-50 p-4 rounded border">
          <div class="flex justify-between items-center">
            <div class="text-center flex-1">
              <div class="font-semibold">${player1?.alias || "Unknown"}</div>
              ${match.score ? `<div class="text-sm text-gray-600">${match.score.player1}</div>` : ""}
            </div>
            <div class="mx-4 text-gray-500">VS</div>
            <div class="text-center flex-1">
              <div class="font-semibold">${player2?.alias || "Unknown"}</div>
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
        <p class="text-gray-600">${roundName} (${remainingPlayers} players remaining)</p>
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

    document.querySelectorAll(".play-match-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const matchId = (e.currentTarget as HTMLElement).getAttribute(
          "data-match-id",
        );
        if (matchId) {
          this.navigateToMatch(matchId);
        }
      });
    });

    document
      .getElementById("new-tournament-btn")
      ?.addEventListener("click", () => {
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
        <h3 class="text-xl font-semibold">${player1?.alias || "Player 1"} vs ${player2?.alias || "Player 2"}</h3>
        <p class="text-gray-600">Match ${matchId} - First to 5 points wins</p>
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
      
      <div class="text-center text-sm text-gray-600">
        <p><strong>${player1?.alias || "Player 1"}:</strong> W/S (Up/Down), A/D (Left/Right)</p>
        <p><strong>${player2?.alias || "Player 2"}:</strong> ↑/↓ (Up/Down), ←/→ (Left/Right)</p>
      </div>
    `;

    this.initializeMatchGame(matchId);
  }

  private initializeMatchGame(matchId: string): void {
    this.gameManager.initializeGame({
      mode: "tournament",
      canvasId: "tournament-pong-canvas",
      onGameEnd: (winner: number) => this.handleMatchEnd(matchId, winner),
    });

    // ゲームコントロールボタンの設定
    const startBtn = document.getElementById(
      "start-tournament-game",
    ) as HTMLButtonElement;
    const pauseBtn = document.getElementById(
      "pause-tournament-game",
    ) as HTMLButtonElement;
    const resetBtn = document.getElementById(
      "reset-tournament-game",
    ) as HTMLButtonElement;

    startBtn?.addEventListener("click", () => {
      this.gameManager.startGame();
      startBtn.disabled = true;
      pauseBtn.disabled = false;
    });

    pauseBtn?.addEventListener("click", () => {
      this.gameManager.pauseGame();
      startBtn.disabled = false;
      pauseBtn.disabled = true;
    });

    resetBtn?.addEventListener("click", () => {
      this.gameManager.resetGame();
      startBtn.disabled = false;
      pauseBtn.disabled = true;
    });
  }

  private handleMatchEnd(matchId: string, winner: number): void {
    const match = this.tournamentData.getMatch(matchId);
    if (!match) return;

    const gameState = this.gameManager.getGameState();
    const score = gameState ? gameState.score : { player1: 0, player2: 0 };

    const winnerId = winner === 1 ? match.player1Id : match.player2Id;
    this.tournamentData.completeMatch(matchId, winnerId, score);

    const winnerPlayer = this.tournamentData.getPlayer(winnerId);
    alert(`${winnerPlayer?.alias || "Player"} wins the match!`);

    // ゲーム終了時にボタンの状態をリセット
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

    // トーナメント進行チェック
    setTimeout(() => {
      if (this.tournamentData.isTournamentComplete()) {
        // トーナメント完了
        this.navigateToResults();
      } else if (this.tournamentData.canAdvanceToNextRound()) {
        // 次のラウンドを生成
        const success = this.tournamentData.generateNextRound();
        if (success) {
          alert(
            `Round ${this.tournamentData.getCurrentTournament()?.currentRound} begins!`,
          );
        }
        this.navigateToBracket();
      } else {
        // 現在のラウンドが未完了
        this.navigateToBracket();
      }
    }, 2000);
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
          <h4 class="text-xl font-semibold text-yellow-800">Winner: ${winner.alias}</h4>
          <p class="text-yellow-600">Wins: ${winner.wins} | Losses: ${winner.losses}</p>
        </div>
        
        <div class="space-y-2">
          <button id="new-tournament" class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded">
            Start New Tournament
          </button>
        </div>
      </div>
    `;

    document.getElementById("new-tournament")?.addEventListener("click", () => {
      this.tournamentData.clearTournament();
      this.navigateToSetup();
    });
  }

  private extractMatchIdFromPath(): string {
    const pathParts = this.currentPath.split("/");
    return pathParts[pathParts.length - 1] || "unknown";
  }

  // ナビゲーションメソッド
  navigateToSetup(): void {
    window.history.pushState(null, "", "/tournament");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  navigateToRegistration(): void {
    window.history.pushState(null, "", "/tournament/setup");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  navigateToBracket(): void {
    window.history.pushState(null, "", "/tournament/bracket");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  navigateToMatch(matchId: string): void {
    window.history.pushState(null, "", `/tournament/match/${matchId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  navigateToResults(): void {
    window.history.pushState(null, "", "/tournament/results");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  navigateToHome(): void {
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  navigateToLogin(): void {
    window.history.pushState(null, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  async handleLogout(): Promise<void> {
    await AuthService.logout();
    this.navigateToHome();
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
    return `<button id="back-button" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">${backText}</button>`;
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
}
