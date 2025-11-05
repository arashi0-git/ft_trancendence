import { router } from "./routes/router";
import { routeConfig, type PageComponent } from "./routes/route-config";

export class App {
  private currentPage: PageComponent | null = null;

  private authContainer: HTMLElement;
  private gameContainer: HTMLElement;

  constructor() {
    const authContainer = document.getElementById("auth-container");
    const gameContainer = document.getElementById("game-container");

    if (!authContainer || !gameContainer) {
      throw new Error(
        "Required DOM elements not found. Ensure #auth-container and #game-container exist.",
      );
    }

    this.authContainer = authContainer;
    this.gameContainer = gameContainer;

    this.setupRoutes();
    this.init();
  }

  private setupRoutes(): void {
    Object.entries(routeConfig).forEach(([path, PageClass]) => {
      router.addRoute(path, () => {
        this.renderPage(PageClass);
      });
    });
  }

  private renderPage(
    PageClass: new (container: HTMLElement) => PageComponent,
  ): void {
    // コンテナの表示/非表示を適切に設定
    const isAuthPage =
      window.location.pathname === "/login" ||
      window.location.pathname === "/register";

    // 同じページクラスで同じコンテナなら、インスタンスを再利用
    const isSamePageClass =
      this.currentPage && this.currentPage.constructor === PageClass;
    const isCurrentlyAuthPage =
      !this.authContainer.classList.contains("hidden");
    const isSameContainer = isAuthPage === isCurrentlyAuthPage;

    if (isSamePageClass && isSameContainer && this.currentPage) {
      // 既存のページインスタンスを再利用してrenderだけ呼び出す
      this.currentPage.render();
    } else {
      // 異なるページまたはコンテナの場合は新規作成
      if (this.currentPage?.destroy) {
        this.currentPage.destroy();
      }

      if (isAuthPage) {
        this.authContainer.classList.remove("hidden");
        this.gameContainer.classList.add("hidden");
        this.currentPage = new PageClass(this.authContainer);
      } else {
        this.authContainer.classList.add("hidden");
        this.gameContainer.classList.remove("hidden");
        this.currentPage = new PageClass(this.gameContainer);
      }

      this.currentPage.render();
    }
  }

  private init(): void {
    console.log("ft_transcendence loading...");
    // ルート登録後に初期ルートを処理
    router.handleInitialRoute();
  }
}
