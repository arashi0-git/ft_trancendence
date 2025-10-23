import { Animation, Color4 } from "@babylonjs/core";
import { SpaceBackground } from "./space-background";

export type TransitionType = "warp" | "zoom" | "rotate" | "fade";

export class PageTransition {
  private spaceBackground: SpaceBackground | null = null;

  constructor(spaceBackground: SpaceBackground | null) {
    this.spaceBackground = spaceBackground;
  }

  public async playTransition(
    type: TransitionType = "warp",
    duration: number = 1000,
  ): Promise<void> {
    if (!this.spaceBackground) return;

    return new Promise((resolve) => {
      switch (type) {
        case "warp":
          this.playWarpTransition(duration, resolve);
          break;
        case "zoom":
          this.playZoomTransition(duration, resolve);
          break;
        case "rotate":
          this.playRotateTransition(duration, resolve);
          break;
        case "fade":
          this.playFadeTransition(duration, resolve);
          break;
        default:
          resolve();
      }
    });
  }

  private playWarpTransition(duration: number, onComplete: () => void): void {
    if (!this.spaceBackground) return;

    const camera = this.spaceBackground.getCamera();

    // ワープエフェクト: カメラが急速に前進
    Animation.CreateAndStartAnimation(
      "warpTransition",
      camera,
      "radius",
      60, // 60fps
      duration / 16.67, // フレーム数
      camera.radius,
      0.1, // 非常に近くまでズーム
      Animation.ANIMATIONLOOPMODE_CONSTANT,
      undefined,
      () => {
        // アニメーション完了後、元の位置に戻す
        setTimeout(() => {
          camera.radius = 5;
          onComplete();
        }, 100);
      },
    );
  }

  private playZoomTransition(duration: number, onComplete: () => void): void {
    if (!this.spaceBackground) return;

    const camera = this.spaceBackground.getCamera();

    // ズームアウト → ズームイン
    Animation.CreateAndStartAnimation(
      "zoomOut",
      camera,
      "radius",
      60,
      duration / 2 / 16.67,
      camera.radius,
      50, // 遠くにズームアウト
      Animation.ANIMATIONLOOPMODE_CONSTANT,
      undefined,
      () => {
        // ズームイン
        Animation.CreateAndStartAnimation(
          "zoomIn",
          camera,
          "radius",
          60,
          duration / 2 / 16.67,
          50,
          5, // 元の位置に戻る
          Animation.ANIMATIONLOOPMODE_CONSTANT,
          undefined,
          onComplete,
        );
      },
    );
  }

  private playRotateTransition(duration: number, onComplete: () => void): void {
    if (!this.spaceBackground) return;

    const camera = this.spaceBackground.getCamera();

    // カメラを1回転
    Animation.CreateAndStartAnimation(
      "rotateTransition",
      camera,
      "alpha",
      60,
      duration / 16.67,
      camera.alpha,
      camera.alpha + Math.PI * 2, // 1回転
      Animation.ANIMATIONLOOPMODE_CONSTANT,
      undefined,
      onComplete,
    );
  }

  private playFadeTransition(duration: number, onComplete: () => void): void {
    if (!this.spaceBackground) return;

    const scene = this.spaceBackground.getScene();
    const originalColor = scene.clearColor.clone();

    // フェードアウト → フェードイン
    Animation.CreateAndStartAnimation(
      "fadeOut",
      scene,
      "clearColor",
      60,
      duration / 2 / 16.67,
      originalColor,
      new Color4(0, 0, 0, 1), // 黒にフェード
      Animation.ANIMATIONLOOPMODE_CONSTANT,
      undefined,
      () => {
        // フェードイン
        Animation.CreateAndStartAnimation(
          "fadeIn",
          scene,
          "clearColor",
          60,
          duration / 2 / 16.67,
          new Color4(0, 0, 0, 1),
          originalColor, // 元の色に戻る
          Animation.ANIMATIONLOOPMODE_CONSTANT,
          undefined,
          onComplete,
        );
      },
    );
  }
}
