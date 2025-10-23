export type UITransitionType =
  | "shootingStar"
  | "warpOut"
  | "spiralOut"
  | "fadeZoom";

export class UITransition {
  public static async playTransition(
    element: HTMLElement,
    type: UITransitionType = "shootingStar",
    duration: number = 1000,
  ): Promise<void> {
    return new Promise((resolve) => {
      switch (type) {
        case "shootingStar":
          this.playShootingStarTransition(element, duration, resolve);
          break;
        case "warpOut":
          this.playWarpOutTransition(element, duration, resolve);
          break;
        case "spiralOut":
          this.playSpiralOutTransition(element, duration, resolve);
          break;
        case "fadeZoom":
          this.playFadeZoomTransition(element, duration, resolve);
          break;
        default:
          resolve();
      }
    });
  }

  private static playShootingStarTransition(
    element: HTMLElement,
    duration: number,
    onComplete: () => void,
  ): void {
    // 超滑らかな流れ星エフェクト（ブラー効果を削除してパフォーマンス向上）
    const keyframes = `
      @keyframes shootingStar {
        0% {
          transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
          opacity: 1;
        }
        5% {
          transform: translate3d(25px, -12px, 0) scale(0.99) rotate(1deg);
          opacity: 0.98;
        }
        15% {
          transform: translate3d(75px, -37px, 0) scale(0.95) rotate(4deg);
          opacity: 0.9;
        }
        30% {
          transform: translate3d(180px, -90px, 0) scale(0.85) rotate(10deg);
          opacity: 0.8;
        }
        50% {
          transform: translate3d(350px, -175px, 0) scale(0.7) rotate(18deg);
          opacity: 0.6;
        }
        70% {
          transform: translate3d(560px, -280px, 0) scale(0.5) rotate(28deg);
          opacity: 0.4;
        }
        85% {
          transform: translate3d(750px, -375px, 0) scale(0.3) rotate(38deg);
          opacity: 0.2;
        }
        100% {
          transform: translate3d(1000px, -500px, 0) scale(0.1) rotate(50deg);
          opacity: 0;
        }
      }
    `;

    // スタイルシートに追加
    this.addKeyframesToDocument(keyframes);

    // ブラウザに最適化を事前準備させる
    element.style.willChange = "transform, opacity";
    element.style.backfaceVisibility = "hidden";
    element.style.transform = "translateZ(0)";
    (element.style as any).webkitFontSmoothing = "antialiased"; // TypeScript型エラー回避
    element.style.transformOrigin = "center center";

    // 次のフレームでアニメーション開始（ブラウザの準備を待つ）
    requestAnimationFrame(() => {
      element.style.animation = `shootingStar ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1) forwards`;
    });

    // アニメーション完了後のクリーンアップ
    const cleanup = () => {
      element.style.willChange = "auto";
      onComplete();
    };

    setTimeout(cleanup, duration);
  }

  private static playWarpOutTransition(
    element: HTMLElement,
    duration: number,
    onComplete: () => void,
  ): void {
    const keyframes = `
      @keyframes warpOut {
        0% {
          transform: scale(1) perspective(1000px) rotateX(0deg);
          opacity: 1;
          filter: blur(0px);
        }
        50% {
          transform: scale(1.2) perspective(1000px) rotateX(30deg);
          opacity: 0.7;
          filter: blur(2px);
        }
        100% {
          transform: scale(0.1) perspective(1000px) rotateX(90deg) translateZ(-1000px);
          opacity: 0;
          filter: blur(10px);
        }
      }
    `;

    this.addKeyframesToDocument(keyframes);

    // ハードウェアアクセラレーション
    element.style.willChange = "transform, opacity, filter";
    element.style.backfaceVisibility = "hidden";

    element.style.animation = `warpOut ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;

    setTimeout(onComplete, duration);
  }

  private static playSpiralOutTransition(
    element: HTMLElement,
    duration: number,
    onComplete: () => void,
  ): void {
    const keyframes = `
      @keyframes spiralOut {
        0% {
          transform: scale(1) rotate(0deg) translate(0, 0);
          opacity: 1;
        }
        25% {
          transform: scale(0.8) rotate(90deg) translate(100px, -100px);
          opacity: 0.8;
        }
        50% {
          transform: scale(0.6) rotate(180deg) translate(200px, -200px);
          opacity: 0.6;
        }
        75% {
          transform: scale(0.3) rotate(270deg) translate(400px, -400px);
          opacity: 0.3;
        }
        100% {
          transform: scale(0.1) rotate(360deg) translate(800px, -800px);
          opacity: 0;
        }
      }
    `;

    this.addKeyframesToDocument(keyframes);

    // ハードウェアアクセラレーション
    element.style.willChange = "transform, opacity";
    element.style.backfaceVisibility = "hidden";

    element.style.animation = `spiralOut ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;

    setTimeout(onComplete, duration);
  }

  private static playFadeZoomTransition(
    element: HTMLElement,
    duration: number,
    onComplete: () => void,
  ): void {
    const keyframes = `
      @keyframes fadeZoom {
        0% {
          transform: scale(1);
          opacity: 1;
          filter: blur(0px);
        }
        50% {
          transform: scale(1.1);
          opacity: 0.5;
          filter: blur(2px);
        }
        100% {
          transform: scale(0);
          opacity: 0;
          filter: blur(5px);
        }
      }
    `;

    this.addKeyframesToDocument(keyframes);

    // ハードウェアアクセラレーション
    element.style.willChange = "transform, opacity, filter";
    element.style.backfaceVisibility = "hidden";

    element.style.animation = `fadeZoom ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;

    setTimeout(onComplete, duration);
  }

  private static addKeyframesToDocument(keyframes: string): void {
    const styleId = "ui-transition-styles";
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    // 既存のキーフレームと重複しないように追加
    if (!styleElement.textContent?.includes(keyframes)) {
      styleElement.textContent += keyframes;
    }
  }

  public static resetElement(element: HTMLElement): void {
    element.style.animation = "";
    element.style.transform = "";
    element.style.opacity = "";
    element.style.filter = "";
    element.style.willChange = "";
    element.style.backfaceVisibility = "";
    element.style.perspective = "";
  }
}
