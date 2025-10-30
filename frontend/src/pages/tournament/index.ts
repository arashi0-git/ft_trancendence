import { TournamentService } from "./tournament.service";
import { SpacePageBase } from "../../shared/components/space-page-base";

export class TournamentPage extends SpacePageBase {
  private service: TournamentService;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new TournamentService();
  }

  async render(): Promise<void> {
    // URLパスに基づいて適切な画面を表示
    const currentPath = window.location.pathname;
    this.service.setCurrentPath(currentPath);

    this.container.innerHTML = this.getTemplate();
    this.initializeAppHeader();
    this.attachEventListeners();
    await this.service.initializeCurrentView();
    this.initializeSpaceBackground();
  }

  private getTemplate(): string {
    const backButton = this.service.getBackButtonTemplate();
    const title = this.service.getPageTitle();

    const content = `
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-white">${title}</h2>
          <div class="space-x-2">
            ${backButton}
          </div>
        </div>

        <div id="tournament-content">
            </div>

        <div id="game-over-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div class="bg-gray-800 p-8 rounded-lg shadow-xl text-center border-2 border-green-500 max-w-sm w-full">
                <h3 id="game-over-title" class="text-3xl font-bold text-white mb-4"></h3>
                <p id="game-over-message" class="text-xl text-gray-300 mb-6"></p>
                <button id="game-over-continue-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105">
                    Continue
                </button>
            </div>
        </div>
    `;

    return this.getSpaceTemplate(content);
  }

  private attachEventListeners(): void {
    document.getElementById("back-button")?.addEventListener("click", () => {
      this.service.handleBackNavigation();
    });

    // 認証関連のイベントリスナーは共通ヘッダーで処理されるため削除
  }

  destroy(): void {
    this.service.cleanup();
    this.cleanupSpaceBackground();
    this.cleanupAppHeader();
  }
}
