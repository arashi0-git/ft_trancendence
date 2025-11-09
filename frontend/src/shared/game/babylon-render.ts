import {
  ArcRotateCamera,
  Color3,
  Engine,
  GlowLayer,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Rectangle, TextBlock } from "@babylonjs/gui";
import { GameState } from "../types/game";

export interface BabylonRenderOptions {
  withBackground?: boolean;
  fieldColorHex?: string;
  ballColorHex?: string;
  paddleColorHex?: string;
  ballRadius?: number;
  player1Name?: string;
  player2Name?: string;
  player3Name?: string;
  player4Name?: string;
}

const DEFAULT_FIELD_COLOR_HEX = "#245224";
const DEFAULT_BALL_COLOR_HEX = "#ffffff";
const DEFAULT_PADDLE_COLOR_HEX = "#ffffff";
const COLOR_HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const BASE_BALL_RADIUS_LOGICAL = 8;

const isValidColorHex = (value: string | undefined): value is string =>
  typeof value === "string" && COLOR_HEX_PATTERN.test(value);

export class BabylonRender {
  private scene: Scene;
  private camera: ArcRotateCamera;
  private readonly FIELD_WIDTH = 28;
  private paddle1Mesh!: Mesh;
  private paddle2Mesh!: Mesh;
  private paddle3Mesh: Mesh | null = null;
  private paddle4Mesh: Mesh | null = null;
  private ballMesh!: Mesh;
  private withBackground: boolean;
  private fieldMesh!: Mesh;
  private centerLineSegments: Mesh[] = [];
  private scoreBoard1: Mesh | null = null;
  private scoreBoard2: Mesh | null = null;
  private scoreTexture1: TextBlock | null = null;
  private scoreTexture2: TextBlock | null = null;
  private scoreBoardTexture: AdvancedDynamicTexture | null = null;
  private glowLayer: GlowLayer | null = null;
  private prevScore1 = -1;
  private prevScore2 = -1;
  private gameWidth: number;
  private gameHeight: number;
  private fieldColorHex: string;
  private ballColorHex: string;
  private paddleColorHex: string;
  private currentBallRadius: number = BASE_BALL_RADIUS_LOGICAL;
  private player1Name: string;
  private player2Name: string;
  private player3Name: string;
  private player4Name: string;
  private playerCount: number = 2;

  constructor(
    engine: Engine,
    gameWidth: number,
    gameHeight: number,
    options: BabylonRenderOptions = {},
  ) {
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.withBackground = options.withBackground ?? false;
    this.player1Name = options.player1Name || "Player 1";
    this.player2Name = options.player2Name || "Player 2";
    this.player3Name = options.player3Name || "Player 3";
    this.player4Name = options.player4Name || "Player 4";
    this.fieldColorHex = isValidColorHex(options.fieldColorHex)
      ? options.fieldColorHex
      : DEFAULT_FIELD_COLOR_HEX;
    this.ballColorHex = isValidColorHex(options.ballColorHex)
      ? options.ballColorHex
      : DEFAULT_BALL_COLOR_HEX;
    this.paddleColorHex = isValidColorHex(options.paddleColorHex)
      ? options.paddleColorHex
      : DEFAULT_PADDLE_COLOR_HEX;
    if (typeof options.ballRadius === "number" && options.ballRadius > 0) {
      this.currentBallRadius = options.ballRadius;
    }
    this.scene = new Scene(engine);

    // カメラを斜め上から見下ろす角度に設定（Pongらしい視点）
    // alpha: -Math.PI/2 で正面から、beta: Math.PI/3 で斜め上から
    this.camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 3, // より浅い角度でフィールドをアップに
      25, // カメラを近づけてフィールドをアップ
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

  public setFieldColor(fieldColorHex: string): void {
    if (!isValidColorHex(fieldColorHex)) {
      console.warn(
        `BabylonRender: invalid field color '${fieldColorHex}' ignored.`,
      );
      return;
    }

    if (this.fieldColorHex === fieldColorHex) {
      return;
    }

    this.fieldColorHex = fieldColorHex;
    if (
      this.fieldMesh?.material &&
      this.fieldMesh.material instanceof StandardMaterial
    ) {
      this.applyFieldColor(this.fieldMesh.material);
    }
  }

  private applyFieldColor(material: StandardMaterial): void {
    const color = Color3.FromHexString(this.fieldColorHex);
    material.diffuseColor = color;
    material.emissiveColor = color.scale(0.25);
  }

  public setBallColor(ballColorHex: string): void {
    if (!isValidColorHex(ballColorHex)) {
      console.warn(
        `BabylonRender: invalid ball color '${ballColorHex}' ignored.`,
      );
      return;
    }

    if (this.ballColorHex === ballColorHex) {
      return;
    }

    this.ballColorHex = ballColorHex;
    if (
      this.ballMesh?.material &&
      this.ballMesh.material instanceof StandardMaterial
    ) {
      this.applyBallColor(this.ballMesh.material);
    }
  }

  private applyBallColor(material: StandardMaterial): void {
    const color = Color3.FromHexString(this.ballColorHex);
    material.diffuseColor = color;
    material.emissiveColor = color.scale(0.4);
  }

  private updateBallMeshScale(radius: number): void {
    if (!this.ballMesh) {
      return;
    }
    const baseRadius = BASE_BALL_RADIUS_LOGICAL;
    if (baseRadius <= 0) {
      return;
    }
    this.currentBallRadius = radius;
    const scaleFactor = Math.max(radius / baseRadius, 0.1);
    this.ballMesh.scaling = new Vector3(scaleFactor, scaleFactor, scaleFactor);
    const baseMeshRadius = 0.25; // half of the initial diameter (0.5)
    this.ballMesh.position.y = baseMeshRadius * scaleFactor;
  }

  public setPaddleColor(paddleColorHex: string): void {
    if (!isValidColorHex(paddleColorHex)) {
      console.warn(
        `BabylonRender: invalid paddle color '${paddleColorHex}' ignored.`,
      );
      return;
    }

    if (this.paddleColorHex === paddleColorHex) {
      return;
    }

    this.paddleColorHex = paddleColorHex;
    this.updatePaddleMaterials();
  }

  private applyPaddleColor(material: StandardMaterial): void {
    const color = Color3.FromHexString(this.paddleColorHex);
    material.diffuseColor = color;
    material.emissiveColor = color.scale(0.3);
  }

  private updatePaddleMaterials(): void {
    const paddleMeshes = [
      this.paddle1Mesh,
      this.paddle2Mesh,
      this.paddle3Mesh,
      this.paddle4Mesh,
    ];
    paddleMeshes.forEach((mesh) => {
      if (mesh?.material instanceof StandardMaterial) {
        this.applyPaddleColor(mesh.material);
      }
    });
  }

  private recreateField() {
    // 既存のフィールドを削除
    if (this.fieldMesh) {
      this.fieldMesh.dispose(false, true);
    }

    // 新しいサイズでフィールドを作成（より大きなフィールド）
    const aspectRatio = this.gameWidth / this.gameHeight;
    const fieldWidth = this.FIELD_WIDTH; // さらに大きく
    const fieldHeight = fieldWidth / aspectRatio;

    this.fieldMesh = MeshBuilder.CreateGround(
      "field",
      { width: fieldWidth, height: fieldHeight },
      this.scene,
    );
    const fieldMaterial = new StandardMaterial("fieldMaterial", this.scene);
    this.applyFieldColor(fieldMaterial);
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
    const fieldWidth = this.FIELD_WIDTH;
    const fieldHeight = fieldWidth / aspectRatio;
    const scaleY = fieldHeight / this.gameHeight;
    const paddleDepth = logicalPaddleHeight * scaleY * 0.7; // パドルを30%短くする
    const paddleMesh = MeshBuilder.CreateBox(
      name,
      { width: 0.2, height: 0.2, depth: paddleDepth },
      this.scene,
    );

    const paddleMaterial = new StandardMaterial(`${name}Material`, this.scene);
    this.applyPaddleColor(paddleMaterial);
    paddleMesh.material = paddleMaterial;
    paddleMesh.position.y = 0.1;
    return paddleMesh;
  }

  public initializeScene(gameState: GameState): void {
    // プレイヤー名を更新
    this.player1Name = gameState.player1.name || "Player 1";
    this.player2Name = gameState.player2.name || "Player 2";
    this.player3Name = gameState.player3?.name || "Player 3";
    this.player4Name = gameState.player4?.name || "Player 4";

    // プレイヤー数を判定
    this.playerCount = gameState.player3 && gameState.player4 ? 4 : 2;

    this.paddle1Mesh?.dispose();
    this.paddle2Mesh?.dispose();
    this.paddle3Mesh?.dispose();
    this.paddle4Mesh?.dispose();
    this.ballMesh?.dispose();
    this.scoreBoard1?.dispose();
    this.scoreBoard2?.dispose();

    // AdvancedDynamicTextureとGlowLayerをdispose（白が濃くなるバグの原因）
    this.scoreBoardTexture?.dispose();
    this.scoreBoardTexture = null;
    this.glowLayer?.dispose();
    this.glowLayer = null;

    this.recreateField();
    this.recreateCenterLine();

    // Creating paddles
    this.paddle1Mesh = this.createPaddleMesh(
      "paddle1",
      gameState.player1.paddle.height,
    );
    this.paddle2Mesh = this.createPaddleMesh(
      "paddle2",
      gameState.player2.paddle.height,
    );

    if (gameState.player3 && gameState.player4) {
      this.paddle3Mesh = this.createPaddleMesh(
        "paddle3",
        gameState.player3.paddle.height,
      );
      this.paddle4Mesh = this.createPaddleMesh(
        "paddle4",
        gameState.player4.paddle.height,
      );
    } else {
      this.paddle3Mesh = null;
      this.paddle4Mesh = null;
    }
    this.updatePaddleMaterials();

    // creating ball (より大きく)
    this.ballMesh = MeshBuilder.CreateSphere(
      "ball",
      { diameter: 0.5 }, // 0.3から0.5に増加
      this.scene,
    );
    const ballMaterial = new StandardMaterial("ballMaterial", this.scene);
    this.applyBallColor(ballMaterial);
    this.ballMesh.material = ballMaterial;
    this.ballMesh.position = new Vector3(0, 0.25, 0);
    this.updateBallMeshScale(gameState.ball.radius);

    this.createScoreBoards();
    this.prevScore1 = -1;
    this.prevScore2 = -1;
    this.updateGameObjects(gameState);
  }

  public createGameObjects() {
    // ゲームサイズに基づいてフィールドサイズを計算（アスペクト比を維持）
    const aspectRatio = this.gameWidth / this.gameHeight;
    const fieldWidth = this.FIELD_WIDTH;
    const fieldHeight = fieldWidth / aspectRatio;

    this.fieldMesh = MeshBuilder.CreateGround(
      "field",
      { width: fieldWidth, height: fieldHeight },
      this.scene,
    );
    const fieldMaterial = new StandardMaterial("fieldMaterial", this.scene);
    this.applyFieldColor(fieldMaterial);
    this.fieldMesh.material = fieldMaterial;

    this.paddle1Mesh = MeshBuilder.CreateBox(
      "paddle1",
      { width: 0.2, height: 0.2, depth: 1.6 },
      this.scene,
    );
    const paddle1Material = new StandardMaterial("paddle1Material", this.scene);
    this.applyPaddleColor(paddle1Material);
    this.paddle1Mesh.material = paddle1Material;
    this.paddle1Mesh.position = new Vector3(-7, 0.1, 0);

    this.paddle2Mesh = MeshBuilder.CreateBox(
      "paddle2",
      { width: 0.2, height: 0.2, depth: 1.6 },
      this.scene,
    );
    const paddle2Material = new StandardMaterial("paddle2Material", this.scene);
    this.applyPaddleColor(paddle2Material);
    this.paddle2Mesh.material = paddle2Material;
    this.paddle2Mesh.position = new Vector3(7, 0.1, 0);
    this.updatePaddleMaterials();

    this.ballMesh = MeshBuilder.CreateSphere(
      "ball",
      { diameter: 0.5 }, // より大きなボール
      this.scene,
    );
    const ballMaterial = new StandardMaterial("ballMaterial", this.scene);
    this.applyBallColor(ballMaterial);
    this.ballMesh.material = ballMaterial;
    this.ballMesh.position = new Vector3(0, 0.25, 0); // Výchozí pozice
    this.updateBallMeshScale(this.currentBallRadius);

    this.createScoreBoards();

    // 中央線作成
    this.createCenterLine();
  }

  private createCenterLine() {
    // 中央線を点線で作成（動的なフィールドサイズに合わせて調整）
    const aspectRatio = this.gameWidth / this.gameHeight;
    const fieldWidth = this.FIELD_WIDTH;
    const fieldHeight = fieldWidth / aspectRatio;

    const lineSegments = 8; // 点線の数
    const segmentLength = fieldHeight / 20; // フィールドサイズに比例した線分の長さ
    const gapLength = segmentLength; // 線分間の隙間
    const totalPatternLength =
      lineSegments * (segmentLength + gapLength) - gapLength;

    // フィールド内に収まるように開始位置を調整
    const startOffset = -totalPatternLength / 2;

    for (let i = 0; i < lineSegments; i++) {
      const positionZ =
        startOffset + i * (segmentLength + gapLength) + segmentLength / 2;
      // フィールド範囲内かチェック
      if (Math.abs(positionZ) <= fieldHeight / 2 - segmentLength / 2) {
        // 各線分を作成
        const lineSegment = MeshBuilder.CreateBox(
          `centerLine${i}`,
          { width: 0.08, height: 0.02, depth: segmentLength },
          this.scene,
        );
        lineSegment.position = new Vector3(0, 0.01, positionZ);
        const lineMaterial = new StandardMaterial(
          `centerLineMaterial${i}`,
          this.scene,
        );
        lineMaterial.diffuseColor = new Color3(1, 1, 1);
        lineMaterial.emissiveColor = new Color3(0.5, 0.5, 0.5); // より明るく光らせる
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
    // フィールドサイズに基づいて計算
    const aspectRatio = this.gameWidth / this.gameHeight;
    const fieldWidth = this.FIELD_WIDTH;
    const fieldHeight = fieldWidth / aspectRatio;

    // スコアボードのサイズ（3Dメッシュ）
    const boardWidth = fieldWidth * 0.6; // フィールド幅の60%
    const boardHeight = boardWidth / 5; // アスペクト比 5:1

    // テクスチャサイズ（高解像度）
    const textureWidth = 1200;
    const textureHeight = 240;

    // 統合スコアボード用のPlane（中央に1つ）
    this.scoreBoard1 = MeshBuilder.CreatePlane(
      "scoreBoard",
      { width: boardWidth, height: boardHeight },
      this.scene,
    );
    this.scoreBoard1.position = new Vector3(0, 5, fieldHeight / 2 + 2); // フィールドの後ろに配置
    this.scoreBoard1.rotation.x = Math.PI / 6; // 少し下向きに傾ける

    // DynamicTextureを使用してスコアボードを描画
    this.scoreBoardTexture = AdvancedDynamicTexture.CreateForMesh(
      this.scoreBoard1,
      textureWidth,
      textureHeight,
    );
    const texture = this.scoreBoardTexture;

    // 外枠コンテナ
    const container = new Rectangle("scoreContainer");
    container.width = "1";
    container.height = "1";
    container.cornerRadius = 60;
    container.thickness = 4;
    container.color = "#00BFFF";
    container.background = "rgba(0, 20, 40, 0.7)";
    texture.addControl(container);

    // 中央区切り線
    const divider = new Rectangle("divider");
    divider.width = "2px";
    divider.height = "160px";
    divider.background = "#00BFFF";
    divider.horizontalAlignment = Rectangle.HORIZONTAL_ALIGNMENT_CENTER;
    divider.verticalAlignment = Rectangle.VERTICAL_ALIGNMENT_CENTER;
    container.addControl(divider);

    // 左チームラベル (Player 1 & Player 3)
    const leftTeamLabel = new TextBlock("leftTeamLabel");
    if (this.playerCount === 4) {
      leftTeamLabel.text = `${this.player1Name.toUpperCase()} & ${this.player3Name.toUpperCase()}`;
    } else {
      leftTeamLabel.text = this.player1Name.toUpperCase();
    }
    leftTeamLabel.color = "#00BFFF";
    leftTeamLabel.fontSize = this.playerCount === 4 ? 32 : 48;
    leftTeamLabel.fontWeight = "bold";
    leftTeamLabel.fontFamily = "Arial";
    leftTeamLabel.textHorizontalAlignment =
      TextBlock.HORIZONTAL_ALIGNMENT_CENTER;
    leftTeamLabel.top = "-60px";
    leftTeamLabel.left = "-300px";
    container.addControl(leftTeamLabel);

    // 右チームラベル (Player 2 & Player 4)
    const rightTeamLabel = new TextBlock("rightTeamLabel");
    if (this.playerCount === 4) {
      rightTeamLabel.text = `${this.player2Name.toUpperCase()} & ${this.player4Name.toUpperCase()}`;
    } else {
      rightTeamLabel.text = this.player2Name.toUpperCase();
    }
    rightTeamLabel.color = "#00BFFF";
    rightTeamLabel.fontSize = this.playerCount === 4 ? 32 : 48;
    rightTeamLabel.fontWeight = "bold";
    rightTeamLabel.fontFamily = "Arial";
    rightTeamLabel.textHorizontalAlignment =
      TextBlock.HORIZONTAL_ALIGNMENT_CENTER;
    rightTeamLabel.top = "-60px";
    rightTeamLabel.left = "300px";
    container.addControl(rightTeamLabel);

    // Player 1 スコア（TextBlockとして保持）
    this.scoreTexture1 = new TextBlock("score1", "0");
    this.scoreTexture1.color = "white";
    this.scoreTexture1.fontSize = 128;
    this.scoreTexture1.fontWeight = "bold";
    this.scoreTexture1.fontFamily = "Arial";
    this.scoreTexture1.textHorizontalAlignment =
      TextBlock.HORIZONTAL_ALIGNMENT_CENTER;
    this.scoreTexture1.top = "30px";
    this.scoreTexture1.left = "-300px";
    container.addControl(this.scoreTexture1);

    // Player 2 スコア（TextBlockとして保持）
    this.scoreTexture2 = new TextBlock("score2", "0");
    this.scoreTexture2.color = "white";
    this.scoreTexture2.fontSize = 128;
    this.scoreTexture2.fontWeight = "bold";
    this.scoreTexture2.fontFamily = "Arial";
    this.scoreTexture2.textHorizontalAlignment =
      TextBlock.HORIZONTAL_ALIGNMENT_CENTER;
    this.scoreTexture2.top = "30px";
    this.scoreTexture2.left = "300px";
    container.addControl(this.scoreTexture2);

    // マテリアル設定
    const scoreMaterial = new StandardMaterial("scoreMaterial", this.scene);
    scoreMaterial.diffuseTexture = texture;
    scoreMaterial.emissiveColor = new Color3(0.2, 0.2, 0.2); // 発光を抑える
    scoreMaterial.opacityTexture = texture;
    this.scoreBoard1.material = scoreMaterial;

    // GlowLayerを追加して発光効果を追加（強度を下げる）
    this.glowLayer = new GlowLayer("glow", this.scene);
    this.glowLayer.intensity = 0.3;

    // scoreBoard2は使用しない
    this.scoreBoard2 = null;
  }

  private updateScoreDisplay(score1: number, score2: number) {
    if (this.scoreTexture1) {
      this.scoreTexture1.text = score1.toString();
    }
    if (this.scoreTexture2) {
      this.scoreTexture2.text = score2.toString();
    }
  }

  public updateGameObjects(gameState: GameState) {
    const aspectRatio = this.gameWidth / this.gameHeight;
    const fieldWidth = this.FIELD_WIDTH;
    const fieldHeight = fieldWidth / aspectRatio;
    const scaleX = fieldWidth / this.gameWidth;
    const scaleY = fieldHeight / this.gameHeight;

    // Paddle 1
    this.paddle1Mesh.position.x =
      (gameState.player1.paddle.x - this.gameWidth / 2) * scaleX;
    this.paddle1Mesh.position.z =
      (this.gameHeight / 2 -
        gameState.player1.paddle.y -
        gameState.player1.paddle.height / 2) *
      scaleY;

    // Paddle 2
    this.paddle2Mesh.position.x =
      (gameState.player2.paddle.x - this.gameWidth / 2) * scaleX;
    this.paddle2Mesh.position.z =
      (this.gameHeight / 2 -
        gameState.player2.paddle.y -
        gameState.player2.paddle.height / 2) *
      scaleY;

    // Paddle 3 and 4
    if (this.paddle3Mesh && gameState.player3) {
      this.paddle3Mesh.position.x =
        (gameState.player3.paddle.x - this.gameWidth / 2) * scaleX;
      this.paddle3Mesh.position.z =
        (this.gameHeight / 2 -
          (gameState.player3.paddle.y + gameState.player3.paddle.height / 2)) *
        scaleY;
    }
    if (this.paddle4Mesh && gameState.player4) {
      this.paddle4Mesh.position.x =
        (gameState.player4.paddle.x - this.gameWidth / 2) * scaleX;
      this.paddle4Mesh.position.z =
        (this.gameHeight / 2 -
          (gameState.player4.paddle.y + gameState.player4.paddle.height / 2)) *
        scaleY;
    }
    // Ball
    this.ballMesh.position.x = (gameState.ball.x - this.gameWidth / 2) * scaleX;
    this.ballMesh.position.z =
      (this.gameHeight / 2 - gameState.ball.y) * scaleY;
    this.updateBallMeshScale(gameState.ball.radius);

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

  public onReady(callback: () => void): void {
    this.scene.executeWhenReady(() => {
      callback();
    });
  }

  public isReady(): boolean {
    return this.scene.isReady();
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
