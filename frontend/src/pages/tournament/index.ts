import { TournamentService } from "./tournament.service";

export class TournamentPage {
  private service: TournamentService;

  constructor(private container: HTMLElement) {
    this.service = new TournamentService();
  }

  render(): void {
    // URLパスに基づいて適切な画面を表示
    const currentPath = window.location.pathname;
    this.service.setCurrentPath(currentPath);

    this.container.innerHTML = this.getTemplate();
    this.attachEventListeners();
    this.service.initializeCurrentView();
  }

  private getTemplate(): string {
    const authButton = this.service.getAuthButtonTemplate();
    const backButton = this.service.getBackButtonTemplate();
    const title = this.service.getPageTitle();

    return `
      <div class="bg-white p-6 rounded-lg shadow-md">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold">${title}</h2>
          <div class="space-x-2">
            ${authButton}
            ${backButton}
          </div>
        </div>

        <div id="tournament-content">
          <!-- 動的コンテンツがここに表示される -->
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    document.getElementById("back-button")?.addEventListener("click", () => {
      this.service.handleBackNavigation();
    });

    document
      .getElementById("login-tournament-btn")
      ?.addEventListener("click", () => {
        this.service.navigateToLogin();
      });

    document
      .getElementById("logout-btn")
      ?.addEventListener("click", async () => {
        await this.service.handleLogout();
      });
  }
}
