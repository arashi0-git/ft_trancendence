import { router } from "./routes/router";
import { routeConfig, type PageComponent } from "./routes/route-config";
import { TournamentDataService } from "./shared/services/tournament-data.service";

export class App {
  private currentPage: PageComponent | null = null;
  private currentContainer: "auth" | "game" | null = null;
  private isRendering: boolean = false;

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
    const tournamentDataService = TournamentDataService.getInstance();
    const guardedTournamentPaths = new Set([
      "/tournament/bracket",
      "/tournament/results",
      "/tournament/match/:matchId",
    ]);

    Object.entries(routeConfig).forEach(([path, PageClass]) => {
      const guard = guardedTournamentPaths.has(path)
        ? (currentPath: string) => {
            const hasTournament = tournamentDataService.getCurrentTournament();
            if (!hasTournament) {
              console.log(
                `Redirecting from ${currentPath} to / (no tournament data)`,
              );
              return "/";
            }
            return null;
          }
        : undefined;

      router.addRoute(
        path,
        () => {
          this.renderPage(PageClass);
        },
        guard ? { guard } : undefined,
      );
    });
  }

  private renderPage(
    PageClass: new (container: HTMLElement) => PageComponent,
  ): void {
    // 並行呼び出しを防止（連打対策）
    if (this.isRendering) {
      return;
    }
    this.isRendering = true;

    try {
      // コンテナの表示/非表示を適切に設定
      const isAuthPage =
        window.location.pathname === "/login" ||
        window.location.pathname === "/register";

      // 明示的な状態管理でコンテナを決定
      const targetContainer: "auth" | "game" = isAuthPage ? "auth" : "game";

      // 同じページクラスで同じコンテナなら、インスタンスを再利用
      const isSamePageClass =
        this.currentPage && this.currentPage instanceof PageClass;
      const isSameContainer = this.currentContainer === targetContainer;

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
          this.currentContainer = "auth";
        } else {
          this.authContainer.classList.add("hidden");
          this.gameContainer.classList.remove("hidden");
          this.currentPage = new PageClass(this.gameContainer);
          this.currentContainer = "game";
        }

        this.currentPage.render();
      }
    } finally {
      this.isRendering = false;
    }
  }

  private init(): void {
    console.log("ft_transcendence loading...");
    // ルート登録後に初期ルートを処理
    router.handleInitialRoute();
  }
}
