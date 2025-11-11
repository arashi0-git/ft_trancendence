import { TournamentService } from "./tournament.service";
import { SpacePageBase } from "../../shared/components/space-page-base";

export class TournamentPage extends SpacePageBase {
  private service: TournamentService;
  private popstateHandler: (() => void) | null = null;

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

    const headerTitle = title
      ? `<h2 class="text-xl font-semibold text-white">${title}</h2>`
      : "";
    const headerActions = backButton
      ? `<div class="space-x-2">${backButton}</div>`
      : "";
    const header =
      headerTitle || headerActions
        ? `
        <div class="flex justify-center items-center mb-2">
          ${headerTitle}
          ${headerActions}
        </div>`
        : "";

    const content = `
        ${header}
        <div id="tournament-content"></div>
        <div
          id="game-over-modal"
          class="hidden fixed inset-0 flex items-center justify-center bg-black/60 z-50 px-4 backdrop-blur"
        >
          <div
            class="w-full max-w-md bg-blue-400/20 border border-blue-400/50 rounded-2xl shadow-2xl p-8 text-center text-white backdrop-blur-lg"
          >
            <h3 id="game-over-title" class="text-3xl font-bold text-blue-100 mb-4"></h3>
            <p id="game-over-message" class="text-xl text-white mb-6"></p>
            <button
              id="game-over-continue-btn"
              class="w-full bg-blue-600 bg-opacity-40 hover:bg-opacity-60 text-white font-semibold py-3 px-6 rounded-lg border border-blue-500 shadow-lg transition-all duration-200"
            >
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

    // ブラウザの戻るボタンをハンドリング
    // 既存のリスナーを削除してから新しいハンドラを登録（累積を防止）
    if (this.popstateHandler) {
      window.removeEventListener("popstate", this.popstateHandler);
    }
    this.popstateHandler = () => {
      const currentPath = window.location.pathname;
      const state = window.history.state;

      // 試合画面からブラケット画面に戻ろうとした場合、代わりに登録画面に遷移
      if (state?.fromMatch && currentPath === "/tournament/bracket") {
        // フラグをクリアして登録画面に遷移
        window.history.replaceState(null, "", "/tournament");
        this.service.setCurrentPath("/tournament");
        this.render();
      } else {
        // 通常の履歴移動の場合は、そのパスをレンダリング
        this.service.setCurrentPath(currentPath);
        this.render();
      }
    };
    window.addEventListener("popstate", this.popstateHandler);

    // 認証関連のイベントリスナーは共通ヘッダーで処理されるため削除
  }

  destroy(): void {
    // popstateリスナーをクリーンアップ
    if (this.popstateHandler) {
      window.removeEventListener("popstate", this.popstateHandler);
      this.popstateHandler = null;
    }
    this.service.cleanup();
    this.cleanupSpaceBackground();
    this.cleanupAppHeader();
  }
}
