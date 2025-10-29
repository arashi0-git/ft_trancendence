import { HomeService } from "./home.service";
import { SpacePageBase } from "../../shared/components/space-page-base";

export class HomePage extends SpacePageBase {
  private service: HomeService;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new HomeService();
  }

  render(): void {
    this.container.innerHTML = this.getTemplate();
    this.attachEventListeners();
    this.initializeSpaceBackground();
  }

  private getTemplate(): string {
    const authButtons = this.service.getAuthButtonsTemplate();

    const content = `
        <h2 class="text-2xl font-bold mb-4 text-center text-white">Welcome to ft_transcendence</h2>
        <p class="text-center text-gray-300 mb-6">Choose how you want to play Pong!</p>
        
        <div class="space-y-4 mb-6">
          <button id="quick-play-btn" class="w-full bg-blue-400 hover:bg-blue-500 text-white py-3 px-4 rounded border border-blue-400 shadow-lg">
            <div class="text-center">
              <div class="font-semibold text-lg">🎮 Quick Play</div>
              <div class="text-sm opacity-90">2 or 4 Players </div>
            </div>
          </button>
          
          <button id="tournament-play-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded border border-blue-600 shadow-lg">
            <div class="text-center">
              <div class="font-semibold text-lg">🏆 Tournament</div>
              <div class="text-sm opacity-90">2-4-8 Players</div>
            </div>
          </button>
          
          <button id="ai-mode-btn" class="w-full bg-blue-800 hover:bg-blue-900 text-white py-3 px-4 rounded border border-blue-800 shadow-lg">
            <div class="text-center">
              <div class="font-semibold text-lg">🤖 AI Mode</div>
              <div class="text-sm opacity-90">1 Player vs Computer - Test your skills</div>
            </div>
          </button>
        </div>
        
        <div class="border-t border-gray-600 pt-4">
          <p class="text-center text-sm text-gray-300 mb-3">Want to save your progress?</p>
          ${authButtons}
        </div>
    `;

    return this.getSpaceTemplate(content);
  }

  private attachEventListeners(): void {
    document
      .getElementById("quick-play-btn")
      ?.addEventListener("click", async () => {
        try {
          await this.playTransitionAndNavigate(
            () => this.service.navigateToQuickPlay(),
            "shootingStar",
            500,
          );
        } catch (error) {
          console.error("Quick Play navigation error:", error);
        }
      });

    document
      .getElementById("tournament-play-btn")
      ?.addEventListener("click", async () => {
        try {
          await this.playTransitionAndNavigate(
            () => this.service.navigateToTournament(),
            "spiralOut",
            600,
          );
        } catch (error) {
          console.error("Tournament navigation error:", error);
        }
      });

    document
      .getElementById("ai-mode-btn")
      ?.addEventListener("click", async () => {
        try {
          await this.playTransitionAndNavigate(
            () => this.service.navigateToAiMode(),
            "warpOut",
            800,
          );
        } catch (error) {
          console.error("AI Mode navigation error:", error);
        }
      });

    document.getElementById("login-btn")?.addEventListener("click", () => {
      this.service.navigateToLogin();
    });

    document.getElementById("register-btn")?.addEventListener("click", () => {
      this.service.navigateToRegister();
    });

    document.getElementById("settings-btn")?.addEventListener("click", () => {
      this.service.navigateToSettings();
    });

    document
      .getElementById("logout-btn")
      ?.addEventListener("click", async () => {
        try {
          await this.service.handleLogout();
        } catch (error) {
          console.error("Logout handler error:", error);
        }
      });
  }

  destroy(): void {
    this.cleanupSpaceBackground();
  }
}
