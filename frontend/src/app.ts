import { router } from "./routes/router";
import { routeConfig, type PageComponent } from "./routes/route-config";

export class App {
  private currentPage: PageComponent | null = null;

  private authContainer: HTMLElement;
  private gameContainer: HTMLElement;

  constructor() {
    this.authContainer = document.getElementById(
      "auth-container",
    ) as HTMLElement;
    this.gameContainer = document.getElementById(
      "game-container",
    ) as HTMLElement;

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
    // 前のページをクリーンアップ
    if (this.currentPage?.destroy) {
      this.currentPage.destroy();
    }

    // コンテナの表示/非表示を適切に設定
    const isAuthPage =
      window.location.pathname === "/login" ||
      window.location.pathname === "/register";

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

  private init(): void {
    console.log("ft_transcendence loading...");
    // ルート登録後に初期ルートを処理
    router.handleInitialRoute();
  }
}
