import "./style.css";
import { LoginForm } from "./components/login-form";
import { AuthService } from "./services/auth-service";

class App {
  private currentView: "welcome" | "login" | "register" | "game" = "welcome";

  constructor() {
    this.init();
  }

  private init(): void {
    console.log("ft_trancendence loading...");

    if (AuthService.isAuthenticated()) {
      this.showGameView();
    } else {
      this.showWelcomeView();
    }
  }

  private showWelcomeView(): void {
    this.currentView = "welcome";
    const authContainer = document.getElementById("auth-container");
    if (authContainer) {
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
                    <p class="text-center text-gray-600 mb-4">Registration from coming soon...</p>
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
                    <h2 class="text-2xl font-bold mb-4 text-center">Game Dashboard</h2>
                    <p class="text-center text-gray-600 mb-4">Welcome to the game! Pong coming soon...</p>
                    <button id="logout-btn" class="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded">
                        Logout
                    </button>
                </div>
            `;

      document
        .getElementById("logout-btn")
        ?.addEventListener("click", async () => {
          await AuthService.logout();
          gameContainer.classList.add("hidden");
          this.showWelcomeView();
        });
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new App();
});
