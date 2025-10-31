import {
  Scene,
  Engine,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  DynamicTexture,
} from "@babylonjs/core";
import { GameState } from "../types/game";

export class BabylonRender {
  private scene: Scene;
  private camera: ArcRotateCamera;
  private paddle1Mesh!: Mesh;
  private paddle2Mesh!: Mesh;
  private paddle3Mesh: Mesh | null = null;
  private paddle4Mesh: Mesh | null = null;
  private ballMesh!: Mesh;
  private withBackground: boolean;
  private fieldMesh!: Mesh;
  private centerLineSegments: Mesh[] = [];
  private scoreBoard1!: Mesh;
  private scoreBoard2!: Mesh;
  private scoreTexture1!: DynamicTexture;
  private scoreTexture2!: DynamicTexture;
  private prevScore1 = -1;
  private prevScore2 = -1;
  private gameWidth: number;
  private gameHeight: number;

  constructor(
    engine: Engine,
    gameWidth: number,
    gameHeight: number,
    withBackground: boolean = false,
  ) {
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.withBackground = withBackground;
    this.scene = new Scene(engine);

    // カメラを斜め上から見下ろす角度に設定（Pongらしい視点）
    // alpha: -Math.PI/2 で正面から、beta: Math.PI/3 で斜め上から
    this.camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 3,
      20,
      Vector3.Zero(),
      this.scene,
    );
    this.camera.setTarget(Vector3.Zero());

    // カメラ操作を有効化（マウスのみ、キーボードは無効）
    const canvas = engine.getRenderingCanvas();
    if (canvas) {
      this.camera.attachControl(canvas, true);
      // キーボード操作を無効化（ゲーム操作と競合しないように）
      this.camera.keysUp = [];
      this.camera.keysDown = [];
      this.camera.keysLeft = [];
      this.camera.keysRight = [];
    }
    this.scene.activeCamera = this.camera;
    const light = new HemisphericLight(
      "light",
      new Vector3(0, 1, 0),
      this.scene,
    );
    light.intensity = 1.2; // より明るいライティング

    // 宇宙空間の背景を作成（オプション）
    if (this.withBackground) {
      this.createSpaceBackground();
    }

    this.createGameObjects();
  }

  public setGameSize(width: number, height: number) {
    this.gameWidth = width;
    this.gameHeight = height;
    // フィールドサイズが変更されたので3Dオブジェクトを再作成
    this.recreateField();
    this.recreateCenterLine();
  }

  private recreateField() {
    // 既存のフィールドを削除
    if (this.fieldMesh) {
      this.fieldMesh.dispose(false, true);
    }

    // 新しいサイズでフィールドを作成
    const aspectRatio = this.gameWidth / this.gameHeight;
    const fieldWidth = 16;
    const fieldHeight = fieldWidth / aspectRatio;

    this.fieldMesh = MeshBuilder.CreateGround(
      "field",
      { width: fieldWidth, height: fieldHeight },
      this.scene,
    );
    const fieldMaterial = new StandardMaterial("fieldMaterial", this.scene);
    fieldMaterial.diffuseColor = new Color3(0.2, 0.3, 0.2);
    fieldMaterial.emissiveColor = new Color3(0.05, 0.1, 0.05);
    this.fieldMesh.material = fieldMaterial;
  }

  private recreateCenterLine() {
    // 既存の中央線セグメントを削除
    this.centerLineSegments.forEach((segment) => {
      segment.dispose(false, true);
    });
    this.centerLineSegments = [];

    // 新しいサイズで中央線を作成
    this.createCenterLine();
  }

  private createPaddleMesh(name: string, logicalPaddleHeight: number): Mesh {
    const aspectRatio = this.gameWidth / this.gameHeight;
    const fieldWidth = 16;
    const fieldHeight = fieldWidth / aspectRatio;
    const scaleY = fieldHeight / this.gameHeight;
    const paddleDepth = logicalPaddleHeight * scaleY;
    const paddleMesh = MeshBuilder.CreateBox(
      name,
      { width: 0.2, height: 0.2, depth: paddleDepth },
      this.scene,
    );

    const paddleMaterial = new StandardMaterial(`${name}Material`, this.scene);
    paddleMaterial.diffuseColor = new Color3(1, 1, 1);
    paddleMaterial.emissiveColor = new Color3(0.3, 0.3, 0.3);
    paddleMesh.material = paddleMaterial;
    paddleMesh.position.y = 0.1;
    return paddleMesh;
  }

  public initializeScene(gameState: GameState): void {
    this.paddle1Mesh?.dispose();
    this.paddle2Mesh?.dispose();
    this.paddle3Mesh?.dispose();
    this.paddle4Mesh?.dispose();
    this.ballMesh?.dispose();
    this.scoreBoard1?.dispose();
    this.scoreBoard2?.dispose();
    this.recreateField();
    this.recreateCenterLine();

    // Creating paddles
    this.paddle1Mesh = this.createPaddleMesh("paddle1", gameState.player1.paddle.height);
    this.paddle2Mesh = this.createPaddleMesh("paddle2", gameState.player2.paddle.height);

    if (gameState.player3 && gameState.player4) {
      this.paddle3Mesh = this.createPaddleMesh("paddle3", gameState.player3.paddle.height);
      this.paddle4Mesh = this.createPaddleMesh("paddle4", gameState.player4.paddle.height);
    } else {
        this.paddle3Mesh = null;
        this.paddle4Mesh = null;
    }

    // creating ball
    this.ballMesh = MeshBuilder.CreateSphere("ball", { diameter: 0.3 }, this.scene);
    const ballMaterial = new StandardMaterial("ballMaterial", this.scene);
    ballMaterial.diffuseColor = new Color3(1, 1, 1);
    ballMaterial.emissiveColor = new Color3(0.4, 0.4, 0.4);
    this.ballMesh.material = ballMaterial;
    this.ballMesh.position = new Vector3(0, 0.15, 0);

    this.createScoreBoards();
    this.prevScore1 = -1;
    this.prevScore2 = -1;
    this.updateGameObjects(gameState);
  }

  public createGameObjects() {
    // ゲームサイズに基づいてフィールドサイズを計算（アスペクト比を維持）
    const aspectRatio = this.gameWidth / this.gameHeight;
    const fieldWidth = 16;
    const fieldHeight = fieldWidth / aspectRatio;

    this.fieldMesh = MeshBuilder.CreateGround(
      "field",
      { width: fieldWidth, height: fieldHeight },
      this.scene,
    );
    const fieldMaterial = new StandardMaterial("fieldMaterial", this.scene);
    fieldMaterial.diffuseColor = new Color3(0.2, 0.3, 0.2);
    fieldMaterial.emissiveColor = new Color3(0.05, 0.1, 0.05);
    this.fieldMesh.material = fieldMaterial;

    this.paddle1Mesh = MeshBuilder.CreateBox(
      "paddle1",
      { width: 0.2, height: 0.2, depth: 1.6 },
      this.scene,
    );
    const paddle1Material = new StandardMaterial("paddle1Material", this.scene);
    paddle1Material.diffuseColor = new Color3(1, 1, 1);
    paddle1Material.emissiveColor = new Color3(0.3, 0.3, 0.3); // より明るく光らせる
    this.paddle1Mesh.material = paddle1Material;
    this.paddle1Mesh.position = new Vector3(-7, 0.1, 0);

    this.paddle2Mesh = MeshBuilder.CreateBox(
      "paddle2",
      { width: 0.2, height: 0.2, depth: 1.6 },
      this.scene,
    );
    const paddle2Material = new StandardMaterial("paddle2Material", this.scene);
    paddle2Material.diffuseColor = new Color3(1, 1, 1);
    paddle2Material.emissiveColor = new Color3(0.3, 0.3, 0.3); // より明るく光らせる
    this.paddle2Mesh.material = paddle2Material;
    this.paddle2Mesh.position = new Vector3(7, 0.1, 0);

    this.ballMesh = MeshBuilder.CreateSphere(
      "ball",
      { diameter: 0.3 },
      this.scene,
    );
    const ballMaterial = new StandardMaterial("ballMaterial", this.scene);
    ballMaterial.diffuseColor = new Color3(1, 1, 1);
    ballMaterial.emissiveColor = new Color3(0.4, 0.4, 0.4);
    this.ballMesh.material = ballMaterial;
    this.ballMesh.position = new Vector3(0, 0.15, 0); // Výchozí pozice

    this.createScoreBoards();

    // 中央線作成
    this.createCenterLine();
  }

  private createCenterLine() {
    // 中央線を点線で作成（動的なフィールドサイズに合わせて調整）
    const aspectRatio = this.gameWidth / this.gameHeight;
    const fieldWidth = 16;
    const fieldHeight = fieldWidth / aspectRatio;

    const lineSegments = 8; // 点線の数
    const segmentLength = fieldHeight / 20; // フィールドサイズに比例した線分の長さ
    const gapLength = segmentLength; // 線分間の隙間
    const totalPatternLength =
      lineSegments * (segmentLength + gapLength) - gapLength;

    // フィールド内に収まるように開始位置を調整
    const startOffset = -totalPatternLength / 2;

    for (let i = 0; i < lineSegments; i++) {
      const positionZ = startOffset + i * (segmentLength + gapLength) + segmentLength / 2;
      // フィールド範囲内かチェック
      if (Math.abs(positionZ) <= fieldHeight / 2 - segmentLength / 2) {
        // 各線分を作成
        const lineSegment = MeshBuilder.CreateBox(`centerLine${i}`, { width: 0.08, height: 0.02, depth: segmentLength }, this.scene);
        lineSegment.position = new Vector3(0, 0.01, positionZ);
        const lineMaterial = new StandardMaterial(`centerLineMaterial${i}`, this.scene);
        lineMaterial.diffuseColor = new Color3(1, 1, 1);
        lineMaterial.emissiveColor = new Color3(0.5, 0.5, 0.5);  // より明るく光らせる
        lineSegment.material = lineMaterial;

        // 作成したセグメントを配列に保存
        this.centerLineSegments.push(lineSegment);
      }
    }
  }

  private createSpaceBackground() {
    // 宇宙空間のSkybox作成
    const skybox = MeshBuilder.CreateSphere(
      "skyBox",
      { diameter: 1000 },
      this.scene,
    );
    const skyboxMaterial = new StandardMaterial("skyBox", this.scene);

    // 内側から見えるように設定
    skyboxMaterial.backFaceCulling = false;

    // 宇宙のグラデーション色
    skyboxMaterial.diffuseColor = new Color3(0.02, 0.02, 0.1);
    skyboxMaterial.emissiveColor = new Color3(0.01, 0.01, 0.05);

    skybox.material = skyboxMaterial;
    skybox.infiniteDistance = true;

    // 星を作成
    this.createStars();

    // 遠くの惑星を作成
    this.createPlanets();
  }

  private createStars() {
    // ランダムな位置に星を配置
    for (let i = 0; i < 200; i++) {
      const star = MeshBuilder.CreateSphere(
        `star${i}`,
        { diameter: 0.1 + Math.random() * 0.3 },
        this.scene,
      );

      // ランダムな位置（球面上）
      const radius = 200 + Math.random() * 200;
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
    // 遠くの惑星1
    const planet1 = MeshBuilder.CreateSphere(
      "planet1",
      { diameter: 20 },
      this.scene,
    );
    planet1.position = new Vector3(-200, 50, -300);
    const planet1Material = new StandardMaterial("planet1Material", this.scene);
    planet1Material.diffuseColor = new Color3(0.8, 0.4, 0.2);
    planet1Material.emissiveColor = new Color3(0.1, 0.05, 0.02);
    planet1.material = planet1Material;

    // 遠くの惑星2
    const planet2 = MeshBuilder.CreateSphere(
      "planet2",
      { diameter: 15 },
      this.scene,
    );
    planet2.position = new Vector3(250, -30, -400);
    const planet2Material = new StandardMaterial("planet2Material", this.scene);
    planet2Material.diffuseColor = new Color3(0.3, 0.5, 0.8);
    planet2Material.emissiveColor = new Color3(0.03, 0.05, 0.08);
    planet2.material = planet2Material;

    // 月のような天体
    const moon = MeshBuilder.CreateSphere("moon", { diameter: 8 }, this.scene);
    moon.position = new Vector3(150, 80, -200);
    const moonMaterial = new StandardMaterial("moonMaterial", this.scene);
    moonMaterial.diffuseColor = new Color3(0.7, 0.7, 0.6);
    moonMaterial.emissiveColor = new Color3(0.05, 0.05, 0.04);
    moon.material = moonMaterial;
  }

  private createScoreBoards() {
    // Player 1 スコアボード
    this.scoreBoard1 = MeshBuilder.CreatePlane(
      "scoreBoard1",
      { width: 2, height: 1 },
      this.scene,
    );
    this.scoreBoard1.position = new Vector3(-4, 3, 0);
    this.scoreBoard1.rotation.x = Math.PI / 6; // 少し下向きに傾ける

    this.scoreTexture1 = new DynamicTexture(
      "scoreTexture1",
      { width: 256, height: 128 },
      this.scene,
    );
    const scoreMaterial1 = new StandardMaterial("scoreMaterial1", this.scene);
    scoreMaterial1.diffuseTexture = this.scoreTexture1;
    scoreMaterial1.emissiveColor = new Color3(0.3, 0.3, 0.3); // 少し光らせる
    this.scoreBoard1.material = scoreMaterial1;

    // Player 2 スコアボード
    this.scoreBoard2 = MeshBuilder.CreatePlane(
      "scoreBoard2",
      { width: 2, height: 1 },
      this.scene,
    );
    this.scoreBoard2.position = new Vector3(4, 3, 0);
    this.scoreBoard2.rotation.x = Math.PI / 6;

    this.scoreTexture2 = new DynamicTexture(
      "scoreTexture2",
      { width: 256, height: 128 },
      this.scene,
    );
    const scoreMaterial2 = new StandardMaterial("scoreMaterial2", this.scene);
    scoreMaterial2.diffuseTexture = this.scoreTexture2;
    scoreMaterial2.emissiveColor = new Color3(0.3, 0.3, 0.3);
    this.scoreBoard2.material = scoreMaterial2;

    // 初期スコア表示
    this.updateScoreDisplay(0, 0);
  }

  private updateScoreDisplay(score1: number, score2: number) {
    // Player 1 スコア更新
    this.scoreTexture1.clear();
    this.scoreTexture1.drawText(
      `Player 1\n${score1}`,
      null,
      null,
      "bold 48px Arial",
      "white",
      "transparent",
      true,
    );

    // Player 2 スコア更新
    this.scoreTexture2.clear();
    this.scoreTexture2.drawText(
      `Player 2\n${score2}`,
      null,
      null,
      "bold 48px Arial",
      "white",
      "transparent",
      true,
    );
  }

  public updateGameObjects(gameState: GameState) {
    const aspectRatio = this.gameWidth / this.gameHeight;
    const fieldWidth = 16;
    const fieldHeight = fieldWidth / aspectRatio;
    const scaleX = fieldWidth / this.gameWidth;
    const scaleY = fieldHeight / this.gameHeight;

    // Paddle 1
    this.paddle1Mesh.position.x = (gameState.player1.paddle.x - this.gameWidth / 2) * scaleX;
    this.paddle1Mesh.position.z = (this.gameHeight / 2 - gameState.player1.paddle.y - gameState.player1.paddle.height / 2) * scaleY;

    // Paddle 2
    this.paddle2Mesh.position.x = (gameState.player2.paddle.x - this.gameWidth / 2) * scaleX;
    this.paddle2Mesh.position.z = (this.gameHeight / 2 - gameState.player2.paddle.y - gameState.player2.paddle.height / 2) * scaleY;

    // Paddle 3 and 4
    if (this.paddle3Mesh && gameState.player3) {
       this.paddle3Mesh.position.x = (gameState.player3.paddle.x - this.gameWidth / 2) * scaleX; // Použij this.gameWidth
       this.paddle3Mesh.position.z = (this.gameHeight / 2 - (gameState.player3.paddle.y + gameState.player3.paddle.height / 2)) * scaleY; // Použij this.gameHeight
    }
     if (this.paddle4Mesh && gameState.player4) {
       this.paddle4Mesh.position.x = (gameState.player4.paddle.x - this.gameWidth / 2) * scaleX; // Použij this.gameWidth
       this.paddle4Mesh.position.z = (this.gameHeight / 2 - (gameState.player4.paddle.y + gameState.player4.paddle.height / 2)) * scaleY; // Použij this.gameHeight
    }
    // Ball
    this.ballMesh.position.x = (gameState.ball.x - this.gameWidth / 2) * scaleX;
    this.ballMesh.position.z = (this.gameHeight / 2 - gameState.ball.y) * scaleY;

    // Score
    const { player1, player2 } = gameState.score;
    if (player1 !== this.prevScore1 || player2 !== this.prevScore2) {
      this.updateScoreDisplay(player1, player2);
      this.prevScore1 = player1;
      this.prevScore2 = player2;
    }
  }

  public render() {
    this.scene.render();
  }

  public dispose() {
    // 中央線セグメントを破棄
    this.centerLineSegments.forEach((segment) => {
      segment.dispose(false, true);
    });
    this.centerLineSegments = [];

    this.scene.dispose();
  }
}
