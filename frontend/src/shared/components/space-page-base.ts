import { SpaceBackground } from "./space-background";

export abstract class SpacePageBase {
  protected spaceBackground: SpaceBackground | null = null;
  protected container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  protected initializeSpaceBackground(): void {
    // 宇宙背景Canvasを追加
    if (!document.getElementById("space-background")) {
      const spaceCanvas = document.createElement("canvas");
      spaceCanvas.id = "space-background";
      spaceCanvas.style.cssText =
        "position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1;";
      document.body.appendChild(spaceCanvas);
    }

    // 宇宙背景を初期化
    setTimeout(() => {
      try {
        this.spaceBackground = new SpaceBackground("space-background");
      } catch (error) {
        console.warn("Space background initialization failed:", error);
      }
    }, 100);
  }

  protected getSpaceTemplate(content: string): string {
    return `
      <div class="bg-transparent p-6 rounded-lg border border-cyan-400 border-opacity-50 shadow-2xl">
        ${content}
      </div>
    `;
  }

  protected cleanupSpaceBackground(): void {
    if (this.spaceBackground) {
      this.spaceBackground.dispose();
      this.spaceBackground = null;
    }
  }

  abstract render(): void;
  abstract destroy(): void;
}
