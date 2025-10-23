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
          UITransition.playShootingStarTransition(element, duration, resolve);
          break;
        case "warpOut":
          UITransition.playWarpOutTransition(element, duration, resolve);
          break;
        case "spiralOut":
          UITransition.playSpiralOutTransition(element, duration, resolve);
          break;
        case "fadeZoom":
          UITransition.playFadeZoomTransition(element, duration, resolve);
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
    let completed = false;

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
    UITransition.addKeyframesToDocument(keyframes);

    // ブラウザに最適化を事前準備させる
    element.style.willChange = "transform, opacity";
    element.style.backfaceVisibility = "hidden";
    element.style.transform = "translateZ(0)";
    (
      element.style as CSSStyleDeclaration & { webkitFontSmoothing: string }
    ).webkitFontSmoothing = "antialiased";
    element.style.transformOrigin = "center center";

    const handleAnimationEnd = () => {
      if (completed) return;
      completed = true;
      element.removeEventListener("animationend", handleAnimationEnd);
      element.style.willChange = "auto";
      element.style.backfaceVisibility = "";
      element.style.transform = "";
      element.style.transformOrigin = "";
      (
        element.style as CSSStyleDeclaration & { webkitFontSmoothing: string }
      ).webkitFontSmoothing = "";
      onComplete();
    };

    element.addEventListener("animationend", handleAnimationEnd, {
      once: true,
    });

    // 次のフレームでアニメーション開始（ブラウザの準備を待つ）
    requestAnimationFrame(() => {
      element.style.animation = `shootingStar ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1) forwards`;
    });

    // Fallback in case animationend doesn't fire
    setTimeout(handleAnimationEnd, duration + 100);
  }

  private static playWarpOutTransition(
    element: HTMLElement,
    duration: number,
    onComplete: () => void,
  ): void {
    let completed = false;

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

    UITransition.addKeyframesToDocument(keyframes);

    // ハードウェアアクセラレーション
    element.style.willChange = "transform, opacity, filter";
    element.style.backfaceVisibility = "hidden";

    const handleAnimationEnd = () => {
      if (completed) return;
      completed = true;
      element.removeEventListener("animationend", handleAnimationEnd);
      element.style.willChange = "auto";
      element.style.backfaceVisibility = "";
      element.style.transform = "";
      element.style.opacity = "";
      element.style.filter = "";
      onComplete();
    };

    element.addEventListener("animationend", handleAnimationEnd, {
      once: true,
    });
    element.style.animation = `warpOut ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;

    // Fallback in case animationend doesn't fire
    setTimeout(handleAnimationEnd, duration + 100);
  }

  private static playSpiralOutTransition(
    element: HTMLElement,
    duration: number,
    onComplete: () => void,
  ): void {
    let completed = false;

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

    UITransition.addKeyframesToDocument(keyframes);

    // ハードウェアアクセラレーション
    element.style.willChange = "transform, opacity";
    element.style.backfaceVisibility = "hidden";

    const handleAnimationEnd = () => {
      if (completed) return;
      completed = true;
      element.removeEventListener("animationend", handleAnimationEnd);
      element.style.willChange = "auto";
      element.style.backfaceVisibility = "";
      element.style.transform = "";
      element.style.opacity = "";
      onComplete();
    };

    element.addEventListener("animationend", handleAnimationEnd, {
      once: true,
    });
    element.style.animation = `spiralOut ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;

    // Fallback in case animationend doesn't fire
    setTimeout(handleAnimationEnd, duration + 100);
  }

  private static playFadeZoomTransition(
    element: HTMLElement,
    duration: number,
    onComplete: () => void,
  ): void {
    let completed = false;

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

    UITransition.addKeyframesToDocument(keyframes);

    // ハードウェアアクセラレーション
    element.style.willChange = "transform, opacity, filter";
    element.style.backfaceVisibility = "hidden";

    const handleAnimationEnd = () => {
      if (completed) return;
      completed = true;
      element.removeEventListener("animationend", handleAnimationEnd);
      element.style.willChange = "auto";
      element.style.backfaceVisibility = "";
      element.style.transform = "";
      element.style.opacity = "";
      element.style.filter = "";
      onComplete();
    };

    element.addEventListener("animationend", handleAnimationEnd, {
      once: true,
    });
    element.style.animation = `fadeZoom ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;

    // Fallback in case animationend doesn't fire
    setTimeout(handleAnimationEnd, duration + 100);
  }

  private static addKeyframesToDocument(keyframes: string): void {
    const styleId = "ui-transition-styles";
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    // アニメーション名を抽出して重複をチェック
    const animationNameMatch = keyframes.match(/@keyframes\s+(\w+)/);
    if (animationNameMatch) {
      const animationName = animationNameMatch[1];
      if (!styleElement.textContent?.includes(`@keyframes ${animationName}`)) {
        styleElement.textContent += keyframes;
      }
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
