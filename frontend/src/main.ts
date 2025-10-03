import "./style.css";
import { LoginForm } from "./components/login-form";
import { AuthService } from "./services/auth-service";
import { PongGame } from "./game/pong-game";
import { TournamentRegistration } from "./components/tournament-registration";
import { Tournament, Match } from "./types/tournament";

class App {
  private currentView:
    | "welcome"
    | "login"
    | "register"
    | "quick-game"
    | "tournament" = "welcome";
  private pongGame: PongGame | null = null;
  private currentTournament: Tournament | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    console.log("ft_transcendence loading...");
    this.showWelcomeView();
  }

  private showWelcomeView(): void {
    this.currentView = "welcome";
    console.log("Current view:", this.currentView);
    const authContainer = document.getElementById("auth-container");
    const gameContainer = document.getElementById("game-container");

    if (authContainer) {
      // auth-containerを表示し、game-containerを隠す
      authContainer.classList.remove("hidden");
      if (gameContainer) {
        gameContainer.classList.add("hidden");
      }

      authContainer.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-2xl font-bold mb-4 text-center">Welcome to ft_transcendence</h2>
                    <p class="text-center text-gray-600 mb-6">Choose how you want to play Pong!</p>
                    
                    <!-- ゲームモード選択 -->
                    <div class="space-y-4 mb-6">
                        <button id="quick-play-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded">
                            <div class="text-center">
                                <div class="font-semibold text-lg">🎮 Quick Play</div>
                                <div class="text-sm opacity-90">2 Players - Start playing immediately</div>
                            </div>
                        </button>
                        
                        <button id="tournament-play-btn" class="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded">
                            <div class="text-center">
                                <div class="font-semibold text-lg">🏆 Tournament</div>
                                <div class="text-sm opacity-90">2-8 Players - Bracket style competition</div>
                            </div>
                        </button>
                    </div>
                    
                    <!-- 認証オプション -->
                    <div class="border-t pt-4">
                        <p class="text-center text-sm text-gray-600 mb-3">Want to save your progress?</p>
                        <div class="space-y-2">
                            <button id="login-btn" class="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">
                                Login to Account
                            </button>
                            <button id="register-btn" class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded">
                                Create Account
                            </button>
                        </div>
                    </div>
                </div>
            `;

      // イベントリスナーを追加
      document
        .getElementById("quick-play-btn")
        ?.addEventListener("click", () => {
          this.showQuickGame();
        });

      document
        .getElementById("tournament-play-btn")
        ?.addEventListener("click", () => {
          this.showTournamentMode();
        });

      document.getElementById("login-btn")?.addEventListener("click", () => {
        this.showLoginView();
      });

      document.getElementById("register-btn")?.addEventListener("click", () => {
        this.showRegisterView();
      });
    }
  }

  private showQuickGame(): void {
    this.currentView = "quick-game";
    const authContainer = document.getElementById("auth-container");
    const gameContainer = document.getElementById("game-container");

    if (authContainer && gameContainer) {
      authContainer.classList.add("hidden");
      gameContainer.classList.remove("hidden");

      gameContainer.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold">Quick Play - Pong</h2>
                        <div class="space-x-2">
                            ${
                              AuthService.isAuthenticated()
                                ? `<button id="logout-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Logout</button>`
                                : `<button id="login-quick-btn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Login</button>`
                            }
                            <button id="back-to-home" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Home</button>
                        </div>
                    </div>

                    <div class="mb-4 text-center">
                        <div class="space-x-4">
                            <button id="start-game" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded">
                                Start Game
                            </button>
                            <button id="pause-game" class="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded" disabled>
                                Pause
                            </button>
                            <button id="reset-game" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded">
                                Reset
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex justify-center mb-4">
                        <canvas id="pong-canvas" class="border-2 border-gray-300 bg-black"></canvas>
                    </div>
                    
                    <div class="text-center text-sm text-gray-600">
                        <p><strong>Player 1:</strong> W/S (Up/Down), A/D (Left/Right)</p>
                        <p><strong>Player 2:</strong> ↑/↓ (Up/Down), ←/→ (Left/Right)</p>
                    </div>
                </div>
            `;

      this.initializePongGame("pong-canvas");
      this.attachQuickGameEventListeners();
    }
  }

  private showTournamentMode(): void {
    this.currentView = "tournament";
    const authContainer = document.getElementById("auth-container");
    const gameContainer = document.getElementById("game-container");

    if (authContainer && gameContainer) {
      authContainer.classList.add("hidden");
      gameContainer.classList.remove("hidden");

      gameContainer.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold">Tournament Mode</h2>
                        <div class="space-x-2">
                            ${
                              AuthService.isAuthenticated()
                                ? `<button id="logout-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Logout</button>`
                                : `<button id="login-tournament-btn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Login</button>`
                            }
                            <button id="back-to-home" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Home</button>
                        </div>
                    </div>

                    <div id="tournament-registration-container">
                        <!-- トーナメント登録コンポーネントがここに表示される -->
                    </div>
                    
                    <div id="tournament-bracket" class="hidden">
                        <!-- トーナメント表がここに表示される -->
                    </div>
                </div>
            `;

      this.initializeTournamentRegistration();
      this.attachTournamentEventListeners();
    }
  }

  private attachQuickGameEventListeners(): void {
    document.getElementById("back-to-home")?.addEventListener("click", () => {
      this.cleanupGame();
      this.showWelcomeView();
    });

    document
      .getElementById("login-quick-btn")
      ?.addEventListener("click", () => {
        this.showLoginView();
      });

    document
      .getElementById("logout-btn")
      ?.addEventListener("click", async () => {
        await AuthService.logout();
        this.cleanupGame();
        this.showWelcomeView();
      });
  }

  private attachTournamentEventListeners(): void {
    document.getElementById("back-to-home")?.addEventListener("click", () => {
      this.cleanupGame();
      this.showWelcomeView();
    });

    document
      .getElementById("login-tournament-btn")
      ?.addEventListener("click", () => {
        this.showLoginView();
      });

    document
      .getElementById("logout-btn")
      ?.addEventListener("click", async () => {
        await AuthService.logout();
        this.cleanupGame();
        this.showWelcomeView();
      });
  }

  private initializeTournamentRegistration(): void {
    const container = document.getElementById(
      "tournament-registration-container",
    );
    if (container) {
      const tournamentReg = new TournamentRegistration(container);

      tournamentReg.setOnTournamentStart((tournament) => {
        this.currentTournament = tournament;
        this.showTournamentBracket();
      });
    }
  }

  private showTournamentBracket(): void {
    if (!this.currentTournament) return;

    document
      .getElementById("tournament-registration-container")
      ?.classList.add("hidden");
    document.getElementById("tournament-bracket")?.classList.remove("hidden");

    this.renderTournamentBracket();
  }

  private sanitizeText(value: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "`": "&#96;",
    };
    return (value ?? "").replace(/[&<>"'`]/g, (char) => map[char]);
  }

  private renderTournamentBracket(): void {
    const bracketContainer = document.getElementById("tournament-bracket");
    if (!bracketContainer || !this.currentTournament) return;

    bracketContainer.innerHTML = `
            <div class="text-center mb-4">
                <h3 class="text-xl font-bold">${this.sanitizeText(this.currentTournament.name)}</h3>
                <p class="text-gray-600">Round ${this.currentTournament.currentRound}</p>
            </div>
            
            <div class="space-y-4">
                ${this.currentTournament.matches
                  .filter(
                    (match) =>
                      match.round === this.currentTournament!.currentRound,
                  )
                  .map((match) => {
                    const player1 = this.currentTournament!.players.find(
                      (p) => p.id === match.player1Id,
                    );
                    const player2 = this.currentTournament!.players.find(
                      (p) => p.id === match.player2Id,
                    );
                    return `
                        <div class="bg-gray-50 p-4 rounded border">
                            <div class="flex justify-between items-center">
                                <div class="text-center flex-1">
                                    <div class="font-semibold">${this.sanitizeText(player1?.alias || "Unknown")}</div>
                                    ${match.score ? `<div class="text-sm text-gray-600">${match.score.player1}</div>` : ""}
                                </div>
                                <div class="mx-4 text-gray-500">VS</div>
                                <div class="text-center flex-1">
                                    <div class="font-semibold">${this.sanitizeText(player2?.alias || "Unknown")}</div>
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
                  .join("")}
            </div>
            
            <div class="mt-6 text-center">
                <button id="new-tournament-btn" class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded">
                    New Tournament
                </button>
            </div>
        `;

    // Playボタンのイベントリスナーを追加
    document.querySelectorAll(".play-match-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const matchId = (e.currentTarget as HTMLElement).getAttribute(
          "data-match-id",
        );
        if (matchId) {
          this.startTournamentMatch(matchId);
        }
      });
    });

    document
      .getElementById("new-tournament-btn")
      ?.addEventListener("click", () => {
        this.initializeTournamentRegistration();
        document
          .getElementById("tournament-registration-container")
          ?.classList.remove("hidden");
        document.getElementById("tournament-bracket")?.classList.add("hidden");
      });
  }

  public startTournamentMatch(matchId: string): void {
    if (!this.currentTournament) return;

    // 該当するマッチを見つける
    const match = this.currentTournament.matches.find((m) => m.id === matchId);
    if (!match) return;

    // マッチのステータスを更新
    match.status = "in_progress";

    // トーナメント試合画面を表示
    this.showTournamentMatchView(match);
  }

  private showTournamentMatchView(match: Match): void {
    const gameContainer = document.getElementById("game-container");
    if (!gameContainer || !this.currentTournament) return;

    const player1 = this.currentTournament.players.find(
      (p) => p.id === match.player1Id,
    );
    const player2 = this.currentTournament.players.find(
      (p) => p.id === match.player2Id,
    );

    gameContainer.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-md">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">Tournament Match</h2>
                    <button id="back-to-bracket" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
                        Back to Bracket
                    </button>
                </div>

                <div class="text-center mb-4">
                    <h3 class="text-xl font-semibold">${this.sanitizeText(player1?.alias || "Unknown")} vs ${this.sanitizeText(player2?.alias || "Unknown")}</h3>
                    <p class="text-gray-600">Round ${match.round} - First to 5 points wins</p>
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
                    <p><strong>${this.sanitizeText(player1?.alias || "Player 1")}:</strong> W/S (Up/Down), A/D (Left/Right)</p>
                    <p><strong>${this.sanitizeText(player2?.alias || "Player 2")}:</strong> ↑/↓ (Up/Down), ←/→ (Left/Right)</p>
                </div>
            </div>
        `;

    // トーナメント用のPongゲームを初期化
    this.initializeTournamentPongGame(match);

    // 戻るボタンのイベントリスナー
    document
      .getElementById("back-to-bracket")
      ?.addEventListener("click", () => {
        this.cleanupGame();
        this.showTournamentBracket();
      });
  }

  private initializeTournamentPongGame(match: Match): void {
    const canvas = document.getElementById(
      "tournament-pong-canvas",
    ) as HTMLCanvasElement;
    if (canvas) {
      if (this.pongGame) {
        this.pongGame.destroy();
      }

      this.pongGame = new PongGame(canvas);

      this.pongGame.on("onScoreUpdate", (score: any) => {
        console.log("Tournament match score updated:", score);
      });

      this.pongGame.on("onGameEnd", (winner: any) => {
        console.log("Tournament match ended, winner:", winner);

        // マッチ結果を記録
        this.recordTournamentMatchResult(match, winner);

        // 勝者を表示
        const player1 = this.currentTournament?.players.find(
          (p) => p.id === match.player1Id,
        );
        const player2 = this.currentTournament?.players.find(
          (p) => p.id === match.player2Id,
        );
        const winnerName =
          winner === 1
            ? player1?.alias
            : winner === 2
              ? player2?.alias
              : "Unknown";
        alert(`${winnerName} wins the match!`);

        // トーナメント表に戻る
        setTimeout(() => {
          this.cleanupGame();
          this.showTournamentBracket();
        }, 2000);
      });

      // ゲームコントロールボタンのイベントリスナー
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
        this.pongGame?.startGame();
        startBtn.disabled = true;
        pauseBtn.disabled = false;
      });

      pauseBtn?.addEventListener("click", () => {
        this.pongGame?.pauseGame();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
      });

      resetBtn?.addEventListener("click", () => {
        this.pongGame?.resetGame();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
      });

      this.pongGame.resetGame();
    }
  }

  private recordTournamentMatchResult(match: Match, winner: number): void {
    if (!this.currentTournament) return;

    // スコアを記録（PongGameから取得）
    const gameState = this.pongGame?.getGameState();
    match.score = gameState
      ? {
          player1: gameState.score.player1,
          player2: gameState.score.player2,
        }
      : {
          player1: 0,
          player2: 0,
        };

    // 勝者を設定
    const player1 = this.currentTournament.players.find(
      (p) => p.id === match.player1Id,
    );
    const player2 = this.currentTournament.players.find(
      (p) => p.id === match.player2Id,
    );
    match.winnerId = winner === 1 ? match.player1Id : match.player2Id;
    match.status = "completed";
    match.playedAt = new Date().toISOString();

    // プレイヤーの勝敗記録を更新
    if (winner === 1 && player1) {
      player1.wins++;
      if (player2) player2.losses++;
    } else if (winner === 2 && player2) {
      player2.wins++;
      if (player1) player1.losses++;
    }

    console.log("Match result recorded:", match);

    // 次のラウンドをチェック
    this.checkTournamentProgress();
  }

  private checkTournamentProgress(): void {
    if (!this.currentTournament) return;

    const currentRoundMatches = this.currentTournament.matches.filter(
      (m) => m.round === this.currentTournament!.currentRound,
    );

    // 現在のラウンドが全て完了しているかチェック
    const allMatchesCompleted = currentRoundMatches.every(
      (m) => m.status === "completed",
    );

    if (allMatchesCompleted) {
      // 次のラウンドを生成するか、トーナメント終了
      if (currentRoundMatches.length === 1) {
        // トーナメント終了
        this.currentTournament.status = "completed";
        const winnerId = currentRoundMatches[0].winnerId;
        this.currentTournament.winner = this.currentTournament.players.find(
          (p) => p.id === winnerId,
        );
        console.log(
          "Tournament completed! Winner:",
          this.currentTournament.winner,
        );
      } else {
        // 次のラウンドを生成
        this.generateNextRound();
      }
    }
  }

  private generateNextRound(): void {
    if (!this.currentTournament) return;

    const currentRoundMatches = this.currentTournament.matches.filter(
      (m) => m.round === this.currentTournament!.currentRound,
    );

    const winners = currentRoundMatches
      .map((m) => m.winnerId)
      .filter((w) => w !== undefined);

    if (winners.length < 2) return;

    // 次のラウンドを作成
    this.currentTournament.currentRound++;
    let matchId = this.currentTournament.matches.length + 1;

    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        const nextMatch: Match = {
          id: `match-${matchId++}`,
          tournamentId: this.currentTournament.id,
          round: this.currentTournament.currentRound,
          player1Id: winners[i]!,
          player2Id: winners[i + 1]!,
          status: "pending" as const,
        };
        this.currentTournament.matches.push(nextMatch);
      }
    }

    console.log("Next round generated:", this.currentTournament.currentRound);
  }

  private showLoginView(): void {
    this.currentView = "login";
    const authContainer = document.getElementById("auth-container");
    const gameContainer = document.getElementById("game-container");

    if (authContainer && gameContainer) {
      authContainer.classList.remove("hidden");
      gameContainer.classList.add("hidden");

      const loginForm = new LoginForm(authContainer);

      loginForm.setOnLoginSuccess((user) => {
        console.log("Login successful, user:", user);
        this.showWelcomeView(); // ログイン後はホームに戻る
      });

      loginForm.setOnShowRegister(() => {
        this.showRegisterView();
      });
    }
  }

  private showRegisterView(): void {
    this.currentView = "register";
    const authContainer = document.getElementById("auth-container");
    const gameContainer = document.getElementById("game-container");

    if (authContainer && gameContainer) {
      authContainer.classList.remove("hidden");
      gameContainer.classList.add("hidden");

      authContainer.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-2xl font-bold mb-4 text-center">Register</h2>
                    <p class="text-center text-gray-600 mb-4">Registration form coming soon...</p>
                    <button id="back-to-welcome" class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded">
                        Back to Home
                    </button>
                </div>
            `;

      document
        .getElementById("back-to-welcome")
        ?.addEventListener("click", () => {
          this.showWelcomeView();
        });
    }
  }

  private initializePongGame(canvasId: string): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (canvas) {
      if (this.pongGame) {
        this.pongGame.destroy();
      }

      this.pongGame = new PongGame(canvas);

      this.pongGame.on("onScoreUpdate", (score: any) => {
        console.log("Score updated:", score);
      });

      this.pongGame.on("onGameEnd", (winner: any) => {
        console.log("Game ended, winner:", winner);
        alert(`Player ${winner} wins!`);

        const startBtn = document.getElementById(
          "start-game",
        ) as HTMLButtonElement;
        const pauseBtn = document.getElementById(
          "pause-game",
        ) as HTMLButtonElement;
        if (startBtn && pauseBtn) {
          startBtn.disabled = false;
          pauseBtn.disabled = true;
        }
      });

      // ゲームコントロールボタンのイベントリスナー
      const startBtn = document.getElementById(
        "start-game",
      ) as HTMLButtonElement;
      const pauseBtn = document.getElementById(
        "pause-game",
      ) as HTMLButtonElement;
      const resetBtn = document.getElementById(
        "reset-game",
      ) as HTMLButtonElement;

      startBtn?.addEventListener("click", () => {
        this.pongGame?.startGame();
        startBtn.disabled = true;
        pauseBtn.disabled = false;
      });

      pauseBtn?.addEventListener("click", () => {
        this.pongGame?.pauseGame();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
      });

      resetBtn?.addEventListener("click", () => {
        this.pongGame?.resetGame();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
      });

      this.pongGame.resetGame();
    }
  }

  private cleanupGame(): void {
    if (this.pongGame) {
      this.pongGame.destroy();
      this.pongGame = null;
    }
    this.currentTournament = null;
  }
}

// グローバルアクセス用
declare global {
  interface Window {
    app: App;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  window.app = app; // グローバルアクセス用
});
