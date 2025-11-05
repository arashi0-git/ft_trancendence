import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  HemisphericLight,
} from "@babylonjs/core";

export class SpaceBackground {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private onResize: () => void;

  constructor(canvasId: string) {
    const el = document.getElementById(canvasId);
    if (!(el instanceof HTMLCanvasElement)) {
      throw new Error(
        `Canvas with id '${canvasId}' not found or not a <canvas>`,
      );
    }
    this.canvas = el;

    // Canvas背景を透明に設定（黒い膜を除去）
    this.canvas.style.backgroundColor = "transparent";

    // Canvasサイズを明示的に設定
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.engine = new Engine(this.canvas, true);
    this.scene = new Scene(this.engine);

    // シーンの背景色を透明に設定（黒い膜を除去）
    this.scene.clearColor = new Color4(0.02, 0.02, 0.1, 0); // アルファを0にして透明化

    // カメラ設定（星がよく見えるように調整）
    this.camera = new ArcRotateCamera(
      "camera",
      0,
      Math.PI / 3, // 少し上向きに
      5, // さらに距離を短く
      Vector3.Zero(),
      this.scene,
    );
    this.scene.activeCamera = this.camera;

    // ライト設定
    const light = new HemisphericLight(
      "light",
      new Vector3(0, 1, 0),
      this.scene,
    );
    light.intensity = 0.3;

    this.createSpaceBackground();
    this.startAnimation();

    // シーンの準備完了を待ってからレンダリングループを開始
    this.scene.executeWhenReady(() => {
      if (this.engine.isDisposed) {
        return;
      }
      this.engine.runRenderLoop(() => {
        if (!this.scene.isReady()) {
          return;
        }
        this.scene.render();
      });
    });

    // リサイズ対応（参照保持してクリーンアップ可能に）
    this.onResize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.engine.resize();
    };
    window.addEventListener("resize", this.onResize);
  }

  private createSpaceBackground() {
    // Skyboxは削除して、シーンの背景色のみで宇宙感を演出
    // 星を作成
    this.createStars();

    // 惑星を作成
    this.createPlanets();
  }

  private createStars() {
    for (let i = 0; i < 200; i++) {
      const star = MeshBuilder.CreateSphere(
        `star${i}`,
        { diameter: 0.1 + Math.random() * 0.3 },
        this.scene,
      );

      const radius = 20 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      star.position.x = radius * Math.sin(phi) * Math.cos(theta);
      star.position.y = radius * Math.cos(phi);
      star.position.z = radius * Math.sin(phi) * Math.sin(theta);

      const starMaterial = new StandardMaterial(`starMaterial${i}`, this.scene);
      // 星をより明るく、色のバリエーションを追加
      const brightness = 0.8 + Math.random() * 0.4;
      const colorVariation = Math.random();
      if (colorVariation < 0.3) {
        // 青白い星
        starMaterial.emissiveColor = new Color3(
          brightness * 0.8,
          brightness * 0.9,
          brightness,
        );
      } else if (colorVariation < 0.6) {
        // 黄色い星
        starMaterial.emissiveColor = new Color3(
          brightness,
          brightness * 0.9,
          brightness * 0.7,
        );
      } else {
        // 赤い星
        starMaterial.emissiveColor = new Color3(
          brightness,
          brightness * 0.7,
          brightness * 0.6,
        );
      }
      star.material = starMaterial;
    }
  }

  private createPlanets() {
    // 大きな惑星
    const planet1 = MeshBuilder.CreateSphere(
      "planet1",
      { diameter: 8 },
      this.scene,
    );
    planet1.position = new Vector3(-25, 15, -30);
    const planet1Material = new StandardMaterial("planet1Material", this.scene);
    planet1Material.diffuseColor = new Color3(0.8, 0.4, 0.2);
    planet1Material.emissiveColor = new Color3(0.1, 0.05, 0.02);
    planet1.material = planet1Material;

    // 青い惑星
    const planet2 = MeshBuilder.CreateSphere(
      "planet2",
      { diameter: 6 },
      this.scene,
    );
    planet2.position = new Vector3(20, -10, -25);
    const planet2Material = new StandardMaterial("planet2Material", this.scene);
    planet2Material.diffuseColor = new Color3(0.3, 0.5, 0.8);
    planet2Material.emissiveColor = new Color3(0.03, 0.05, 0.08);
    planet2.material = planet2Material;
  }

  private startAnimation() {
    // カメラをゆっくり回転させる
    this.scene.registerBeforeRender(() => {
      this.camera.alpha += 0.001;
    });
  }

  // アニメーション用のアクセサー
  public getCamera() {
    return this.camera;
  }

  public getScene() {
    return this.scene;
  }

  public dispose() {
    try {
      window.removeEventListener("resize", this.onResize);
    } catch {
      // Ignore errors during cleanup
    }

    // エンジンが既に破棄されていないかチェック
    if (!this.engine.isDisposed) {
      this.engine.stopRenderLoop();
      this.scene.dispose();
      this.engine.dispose();
    }
  }
}
