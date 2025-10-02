import "./style.css";
import { LoginForm } from "./components/login-form";
import { AuthService } from "./services/auth-service";
import { PongGame } from "./game/pong-game";

class App {
  private currentView: "welcome" | "login" | "register" | "game" = "welcome";
  private pongGame: PongGame | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    console.log("ft_transcendence loading...");

    if (AuthService.isAuthenticated()) {
      this.showGameView();
    } else {
      this.showWelcomeView();
    }
  }

  private showWelcomeView(): void {
    this.currentView = "welcome";
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
                    <div class="space-y-4">
                        <button id="login-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
                            Login
                        </button>
                        <button id="register-btn" class="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">
                            Register
                        </button>
                    </div>
                </div>
            `;

      document.getElementById("login-btn")?.addEventListener("click", () => {
        this.showLoginView();
      });

      document.getElementById("register-btn")?.addEventListener("click", () => {
        this.showRegisterView();
      });
    }
  }

  private showLoginView(): void {
    this.currentView = "login";
    const authContainer = document.getElementById("auth-container");
    if (authContainer) {
      const loginForm = new LoginForm(authContainer);

      loginForm.setOnLoginSuccess((user) => {
        console.log("Login successful, user:", user);
        this.showGameView();
      });

      loginForm.setOnShowRegister(() => {
        this.showRegisterView();
      });
    }
  }

  private showRegisterView(): void {
    this.currentView = "register";
    const authContainer = document.getElementById("auth-container");
    if (authContainer) {
      authContainer.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-2xl font-bold mb-4 text-center">Register</h2>
                    <p class="text-center text-gray-600 mb-4">Registration form coming soon...</p>
                    <button id="back-to-welcome" class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded">
                        Back to Welcome
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

  private showGameView(): void {
    this.currentView = "game";
    const authContainer = document.getElementById("auth-container");
    const gameContainer = document.getElementById("game-container");

    if (authContainer && gameContainer) {
      authContainer.classList.add("hidden");

      gameContainer.classList.remove("hidden");
      gameContainer.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-md">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">Pong Game</h2>
                    <button id="logout-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
                        Logout
                    </button>
                </div>

                <!-- Score Display -->
                <div id="score-display" class="text-center text-xl font-bold mb-4 p-3 bg-gray-100 rounded-lg">
                    Player 1: 0 - Player 2: 0
                </div>

                <!-- Winner Display -->
                <div id="winner-display" class="hidden mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center">
                    <h3 class="text-xl font-bold">🎉 Game Over! 🎉</h3>
                    <p id="winner-text" class="text-lg mt-2"></p>
                    <button id="dismiss-winner" class="mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                        Continue
                    </button>
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

      this.initializePongGame();

      document
        .getElementById("logout-btn")
        ?.addEventListener("click", async () => {
          await AuthService.logout();
          this.cleanupGame();
          gameContainer.classList.add("hidden");
          this.showWelcomeView();
        });
    }
  }

  private initializePongGame(): void {
    const canvas = document.getElementById("pong-canvas") as HTMLCanvasElement;
    if (canvas) {
      if (this.pongGame) {
        this.pongGame.destroy();
      }

      this.pongGame = new PongGame(canvas);

      this.pongGame.on("onScoreUpdate", (score) => {
        console.log("Score updated:", score);
        const scoreDisplay = document.getElementById("score-display");
        if (scoreDisplay) {
          scoreDisplay.textContent = `Player 1: ${score.player1} - Player 2: ${score.player2}`;
        }
      });

      this.pongGame.on("onGameEnd", (winner: number) => {
        console.log("Game ended, winner:", winner);

        // 専用のUI要素に勝者を表示
        const winnerDisplay = document.getElementById("winner-display");
        const winnerText = document.getElementById("winner-text");
        if (winnerDisplay && winnerText) {
          winnerText.textContent = `Player ${winner} wins!`;
          winnerDisplay.classList.remove("hidden");
        }

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
        // リセット時に勝者表示を隠す
        const winnerDisplay = document.getElementById("winner-display");
        if (winnerDisplay) {
          winnerDisplay.classList.add("hidden");
        }
        // リセット時にスコア表示を初期化
        const scoreDisplay = document.getElementById("score-display");
        if (scoreDisplay) {
          scoreDisplay.textContent = "Player 1: 0 - Player 2: 0";
        }
      });

      // 勝者表示を閉じるボタンのイベントリスナー
      const dismissWinnerBtn = document.getElementById("dismiss-winner");
      dismissWinnerBtn?.addEventListener("click", () => {
        const winnerDisplay = document.getElementById("winner-display");
        if (winnerDisplay) {
          winnerDisplay.classList.add("hidden");
        }
      });

      this.pongGame.resetGame();
    }
  }

  private cleanupGame(): void {
    if (this.pongGame) {
      this.pongGame.destroy();
      this.pongGame = null;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new App();
});
