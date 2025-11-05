import { SpaceBackground } from "./space-background";
import { UITransition, type UITransitionType } from "./ui-transition";
import { AppHeader } from "./app-header";

export abstract class SpacePageBase {
  protected spaceBackground: SpaceBackground | null = null;
  protected container: HTMLElement;
  protected appHeader: AppHeader | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  protected initializeSpaceBackground(): void {
    // 既存のSpaceBackgroundがあれば先にクリーンアップ（WebGLエラー防止）
    if (this.spaceBackground) {
      this.spaceBackground.dispose();
      this.spaceBackground = null;
    }

    // 即座に黒背景を適用（ちらつき防止）
    document.body.style.backgroundColor = "#0a0a0a";

    // 宇宙背景Canvasを追加
    if (!document.getElementById("space-background")) {
      const spaceCanvas = document.createElement("canvas");
      spaceCanvas.id = "space-background";
      spaceCanvas.style.cssText =
        "position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background-color: transparent;";
      document.body.appendChild(spaceCanvas);
    }

    // 宇宙背景を初期化（次のフレームで即座に）
    requestAnimationFrame(() => {
      try {
        this.spaceBackground = new SpaceBackground("space-background");
      } catch (error) {
        console.warn("Space background initialization failed:", error);
      }
    });
  }

  protected getSpaceTemplate(content: string): string {
    return `
      <div id="app-header-container"></div>
      <div class="bg-transparent p-4">
        <div class="page-content">
          ${content}
        </div>
      </div>
    `;
  }

  protected initializeAppHeader(): void {
    // DOM更新を待つために次のフレームで実行
    requestAnimationFrame(() => {
      // まずthis.containerから検索
      let headerContainer: HTMLElement | null = this.container.querySelector(
        "#app-header-container",
      );

      // 見つからない場合はdocument全体から検索
      if (!headerContainer) {
        headerContainer = document.getElementById("app-header-container");
      }

      if (headerContainer) {
        this.appHeader = new AppHeader(headerContainer);
        this.appHeader.render();
      } else {
        // さらに遅延して再試行
        setTimeout(() => {
          const retryContainer: HTMLElement | null =
            this.container.querySelector("#app-header-container") ||
            document.getElementById("app-header-container");
          if (retryContainer) {
            this.appHeader = new AppHeader(retryContainer);
            this.appHeader.render();
          }
        }, 100);
      }
    });
  }

  protected async playTransitionAndNavigate(
    navigationFn: () => void | Promise<void>,
    uiTransitionType: UITransitionType = "shootingStar",
    duration: number = 800,
  ): Promise<void> {
    // ヘッダーを除いたページコンテンツ部分のみにアニメーションを適用
    const uiElement = this.container.querySelector(
      ".page-content",
    ) as HTMLElement;

    if (uiElement) {
      // UIアニメーションのみを実行
      await UITransition.playTransition(uiElement, uiTransitionType, duration);
    } else {
      // フォールバック: .bg-transparentを使用するが、ヘッダーは除外
      const fallbackElement = this.container.querySelector(
        ".bg-transparent",
      ) as HTMLElement;
      if (fallbackElement) {
        await UITransition.playTransition(
          fallbackElement,
          uiTransitionType,
          duration,
        );
      }
    }

    await navigationFn();
  }

  protected cleanupSpaceBackground(): void {
    if (this.spaceBackground) {
      this.spaceBackground.dispose();
      this.spaceBackground = null;
    }

    const canvas = document.getElementById("space-background");
    if (canvas) {
      canvas.remove();
    }
  }

  protected cleanupAppHeader(): void {
    if (this.appHeader) {
      this.appHeader.destroy();
      this.appHeader = null;
    }
  }

  abstract render(): void;
  abstract destroy(): void;
}
