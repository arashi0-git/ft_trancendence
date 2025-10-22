import { TournamentService } from "./tournament.service";
import { SpacePageBase } from "../../shared/components/space-page-base";

export class TournamentPage extends SpacePageBase {
  private service: TournamentService;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new TournamentService();
  }

  render(): void {
    // URLパスに基づいて適切な画面を表示
    const currentPath = window.location.pathname;
    this.service.setCurrentPath(currentPath);

    this.container.innerHTML = this.getTemplate();
    this.attachEventListeners();
    this.service.initializeCurrentView();
    this.initializeSpaceBackground();
  }

  private getTemplate(): string {
    const authButton = this.service.getAuthButtonTemplate();
    const backButton = this.service.getBackButtonTemplate();
    const title = this.service.getPageTitle();

    const content = `
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-white">${title}</h2>
          <div class="space-x-2">
            ${authButton}
            ${backButton}
          </div>
        </div>

        <div id="tournament-content">
          <!-- 動的コンテンツがここに表示される -->
        </div>
    `;

    return this.getSpaceTemplate(content);
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
        try {
          await this.service.handleLogout();
        } catch (error) {
          console.error("Logout handler error:", error);
        }
      });
  }

  destroy(): void {
    this.service.cleanup();
    this.cleanupSpaceBackground();
  }
}
