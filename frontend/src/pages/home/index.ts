import { HomeService } from "./home.service";

export class HomePage {
  private service: HomeService;

  constructor(private container: HTMLElement) {
    this.service = new HomeService();
  }

  render(): void {
    this.container.innerHTML = this.getTemplate();
    this.attachEventListeners();
  }

  private getTemplate(): string {
    const authButtons = this.service.getAuthButtonsTemplate();

    return `
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-4 text-center">Welcome to ft_transcendence</h2>
        <p class="text-center text-gray-600 mb-6">Choose how you want to play Pong!</p>
        
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
        
        <div class="border-t pt-4">
          <p class="text-center text-sm text-gray-600 mb-3">Want to save your progress?</p>
          ${authButtons}
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    document.getElementById("quick-play-btn")?.addEventListener("click", () => {
      this.service.navigateToQuickPlay();
    });

    document
      .getElementById("tournament-play-btn")
      ?.addEventListener("click", () => {
        this.service.navigateToTournament();
      });

    document.getElementById("login-btn")?.addEventListener("click", () => {
      this.service.navigateToLogin();
    });

    document.getElementById("register-btn")?.addEventListener("click", () => {
      this.service.navigateToRegister();
    });

    document
      .getElementById("logout-btn")
      ?.addEventListener("click", async () => {
        await this.service.handleLogout();
      });
  }
}
