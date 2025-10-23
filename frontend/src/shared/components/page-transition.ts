import { Animation, Color4 } from "@babylonjs/core";
import type { SpaceBackground } from "./space-background";

export type TransitionType = "warp" | "zoom" | "rotate" | "fade";

export class PageTransition {
  private spaceBackground: SpaceBackground | null = null;
  private isTransitioning: boolean = false;

  constructor(spaceBackground: SpaceBackground | null) {
    this.spaceBackground = spaceBackground;
  }

  public async playTransition(
    type: TransitionType = "warp",
    duration: number = 1000,
  ): Promise<void> {
    if (!this.spaceBackground) return;

    if (this.isTransitioning) {
      console.warn("Transition already in progress");
      return;
    }

    return new Promise((resolve, reject) => {
      this.isTransitioning = true;

      const onComplete = () => {
        this.isTransitioning = false;
        resolve();
      };

      const onError = (error: Error) => {
        this.isTransitioning = false;
        reject(error);
      };

      try {
        switch (type) {
          case "warp":
            this.playWarpTransition(duration, onComplete, onError);
            break;
          case "zoom":
            this.playZoomTransition(duration, onComplete, onError);
            break;
          case "rotate":
            this.playRotateTransition(duration, onComplete, onError);
            break;
          case "fade":
            this.playFadeTransition(duration, onComplete, onError);
            break;
          default:
            onComplete();
        }
      } catch (error) {
        onError(error as Error);
      }
    });
  }

  private playWarpTransition(
    duration: number,
    onComplete: () => void,
    onError: (error: Error) => void,
  ): void {
    if (!this.spaceBackground) {
      onError(new Error("SpaceBackground is not available"));
      return;
    }

    try {
      const camera = this.spaceBackground.getCamera();
      const originalRadius = camera.radius;

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
          try {
            // 即座に元の位置に戻すアニメーション
            Animation.CreateAndStartAnimation(
              "warpReset",
              camera,
              "radius",
              60,
              6, // 100msで戻す (60fps * 0.1s)
              0.1,
              originalRadius,
              Animation.ANIMATIONLOOPMODE_CONSTANT,
              undefined,
              onComplete,
            );
          } catch (error) {
            onError(error as Error);
          }
        },
      );
    } catch (error) {
      onError(error as Error);
    }
  }

  private playZoomTransition(
    duration: number,
    onComplete: () => void,
    onError: (error: Error) => void,
  ): void {
    if (!this.spaceBackground) {
      onError(new Error("SpaceBackground is not available"));
      return;
    }

    try {
      const camera = this.spaceBackground.getCamera();
      const originalRadius = camera.radius;

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
          try {
            // ズームイン
            Animation.CreateAndStartAnimation(
              "zoomIn",
              camera,
              "radius",
              60,
              duration / 2 / 16.67,
              50,
              originalRadius, // 元の位置に戻る
              Animation.ANIMATIONLOOPMODE_CONSTANT,
              undefined,
              onComplete,
            );
          } catch (error) {
            onError(error as Error);
          }
        },
      );
    } catch (error) {
      onError(error as Error);
    }
  }

  private playRotateTransition(
    duration: number,
    onComplete: () => void,
    onError: (error: Error) => void,
  ): void {
    if (!this.spaceBackground) {
      onError(new Error("SpaceBackground is not available"));
      return;
    }

    try {
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
    } catch (error) {
      onError(error as Error);
    }
  }

  private playFadeTransition(
    duration: number,
    onComplete: () => void,
    onError: (error: Error) => void,
  ): void {
    if (!this.spaceBackground) {
      onError(new Error("SpaceBackground is not available"));
      return;
    }

    try {
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
          try {
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
          } catch (error) {
            onError(error as Error);
          }
        },
      );
    } catch (error) {
      onError(error as Error);
    }
  }
}
