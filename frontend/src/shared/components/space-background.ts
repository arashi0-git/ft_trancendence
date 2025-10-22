import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  HemisphericLight,
} from "@babylonjs/core";

export class SpaceBackground {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas with id '${canvasId}' not found`);
    }

    this.engine = new Engine(this.canvas, true);
    this.scene = new Scene(this.engine);

    // カメラ設定（ゆっくり回転）
    this.camera = new ArcRotateCamera(
      "camera",
      0,
      Math.PI / 2,
      50,
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

    // レンダリングループ
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    // リサイズ対応
    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  private createSpaceBackground() {
    // 宇宙のSkybox
    const skybox = MeshBuilder.CreateSphere(
      "skyBox",
      { diameter: 1000 },
      this.scene,
    );
    const skyboxMaterial = new StandardMaterial("skyBox", this.scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.diffuseColor = new Color3(0.02, 0.02, 0.1);
    skyboxMaterial.emissiveColor = new Color3(0.01, 0.01, 0.05);
    skybox.material = skyboxMaterial;
    skybox.infiniteDistance = true;

    // 星を作成
    this.createStars();

    // 惑星を作成
    this.createPlanets();
  }

  private createStars() {
    for (let i = 0; i < 150; i++) {
      const star = MeshBuilder.CreateSphere(
        `star${i}`,
        { diameter: 0.2 + Math.random() * 0.5 },
        this.scene,
      );

      const radius = 200 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      star.position.x = radius * Math.sin(phi) * Math.cos(theta);
      star.position.y = radius * Math.cos(phi);
      star.position.z = radius * Math.sin(phi) * Math.sin(theta);

      const starMaterial = new StandardMaterial(`starMaterial${i}`, this.scene);
      starMaterial.emissiveColor = new Color3(1, 1, 0.8 + Math.random() * 0.2);
      star.material = starMaterial;
    }
  }

  private createPlanets() {
    // 大きな惑星
    const planet1 = MeshBuilder.CreateSphere(
      "planet1",
      { diameter: 30 },
      this.scene,
    );
    planet1.position = new Vector3(-150, 20, -200);
    const planet1Material = new StandardMaterial("planet1Material", this.scene);
    planet1Material.diffuseColor = new Color3(0.8, 0.4, 0.2);
    planet1Material.emissiveColor = new Color3(0.1, 0.05, 0.02);
    planet1.material = planet1Material;

    // 青い惑星
    const planet2 = MeshBuilder.CreateSphere(
      "planet2",
      { diameter: 20 },
      this.scene,
    );
    planet2.position = new Vector3(180, -40, -250);
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

  public dispose() {
    this.engine.dispose();
  }
}
