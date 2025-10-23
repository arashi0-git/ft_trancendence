import { SpaceBackground } from "./space-background";
import { PageTransition, TransitionType } from "./page-transition";
import { UITransition, UITransitionType } from "./ui-transition";

export abstract class SpacePageBase {
  protected spaceBackground: SpaceBackground | null = null;
  protected container: HTMLElement;
  protected pageTransition: PageTransition | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  protected initializeSpaceBackground(): void {
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
        this.pageTransition = new PageTransition(this.spaceBackground);
      } catch (error) {
        console.warn("Space background initialization failed:", error);
      }
    });
  }

  protected getSpaceTemplate(content: string): string {
    return `
      <div class="bg-transparent p-6 rounded-lg border border-cyan-400 border-opacity-50 shadow-2xl">
        ${content}
      </div>
    `;
  }

  protected async playTransitionAndNavigate(
    navigationFn: () => void,
    transitionType: TransitionType = "warp",
    uiTransitionType: UITransitionType = "shootingStar",
    duration: number = 800,
  ): Promise<void> {
    // UIアニメーションを優先して実行（滑らかさを重視）
    const uiElement = this.container.querySelector(
      ".bg-transparent",
    ) as HTMLElement;

    if (uiElement) {
      // UIアニメーションのみを実行
      await UITransition.playTransition(uiElement, uiTransitionType, duration);
    }

    navigationFn();
  }

  protected cleanupSpaceBackground(): void {
    if (this.spaceBackground) {
      this.spaceBackground.dispose();
      this.spaceBackground = null;
    }
    this.pageTransition = null;
    const canvas = document.getElementById("space-background");
    if (canvas) {
      canvas.remove();
    }
  }

  abstract render(): void;
  abstract destroy(): void;
}
