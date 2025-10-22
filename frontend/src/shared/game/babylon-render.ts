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
  private ballMesh!: Mesh;
  private fieldMesh!: Mesh;
  private scoreBoard1!: Mesh;
  private scoreBoard2!: Mesh;
  private scoreTexture1!: DynamicTexture;
  private scoreTexture2!: DynamicTexture;
  private prevScore1 = -1;
  private prevScore2 = -1;

  constructor(engine: Engine) {
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
    light.intensity = 0.7;

    this.createGameObjects();
  }

  public createGameObjects() {
    this.fieldMesh = MeshBuilder.CreateGround(
      "field",
      { width: 16, height: 8 },
      this.scene,
    );
    const fieldMaterial = new StandardMaterial("fieldMaterial", this.scene);
    fieldMaterial.diffuseColor = new Color3(0.1, 0.1, 0.1);
    this.fieldMesh.material = fieldMaterial;

    this.paddle1Mesh = MeshBuilder.CreateBox(
      "paddle1",
      { width: 0.2, height: 0.2, depth: 1.6 },
      this.scene,
    );
    const paddle1Material = new StandardMaterial("paddle1Material", this.scene);
    paddle1Material.diffuseColor = new Color3(1, 1, 1);
    this.paddle1Mesh.material = paddle1Material;
    this.paddle1Mesh.position = new Vector3(-7, 0.1, 0);

    this.paddle2Mesh = MeshBuilder.CreateBox(
      "paddle2",
      { width: 0.2, height: 0.2, depth: 1.6 },
      this.scene,
    );
    const paddle2Material = new StandardMaterial("paddle2Material", this.scene);
    paddle2Material.diffuseColor = new Color3(1, 1, 1);
    this.paddle2Mesh.material = paddle2Material;
    this.paddle2Mesh.position = new Vector3(7, 0.1, 0);

    this.ballMesh = MeshBuilder.CreateSphere(
      "ball",
      { diameter: 0.3 },
      this.scene,
    );
    const ballMaterial = new StandardMaterial("ballMaterial", this.scene);
    ballMaterial.diffuseColor = new Color3(1, 1, 1);
    this.ballMesh.material = ballMaterial;
    this.ballMesh.position = new Vector3(0, 0.15, 0);

    // スコアボード作成
    this.createScoreBoards();

    // 中央線作成
    this.createCenterLine();
  }

  private createCenterLine() {
    // 中央線を点線で作成（フィールドサイズに合わせて調整）
    const fieldHeight = 8; // フィールドの高さ
    const lineSegments = 8; // 点線の数を減らす
    const segmentLength = 0.5; // 各線分の長さ
    const gapLength = 0.5; // 線分間の隙間
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
          {
            width: 0.08,
            height: 0.02,
            depth: segmentLength,
          },
          this.scene,
        );

        lineSegment.position = new Vector3(0, 0.01, positionZ);

        const lineMaterial = new StandardMaterial(
          `centerLineMaterial${i}`,
          this.scene,
        );
        lineMaterial.diffuseColor = new Color3(1, 1, 1);
        lineMaterial.emissiveColor = new Color3(0.2, 0.2, 0.2); // 少し光らせる
        lineSegment.material = lineMaterial;
      }
    }
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
    const scaleX = 16 / 800;
    const scaleY = 8 / 400;

    // パドル位置更新
    this.paddle1Mesh.position.x = (gameState.player1.paddle.x - 400) * scaleX;
    this.paddle1Mesh.position.z =
      (200 - gameState.player1.paddle.y - gameState.player1.paddle.height / 2) *
      scaleY;

    this.paddle2Mesh.position.x = (gameState.player2.paddle.x - 400) * scaleX;
    this.paddle2Mesh.position.z =
      (200 - gameState.player2.paddle.y - gameState.player2.paddle.height / 2) *
      scaleY;

    // ボール位置更新
    this.ballMesh.position.x = (gameState.ball.x - 400) * scaleX;
    this.ballMesh.position.z = (200 - gameState.ball.y) * scaleY;

    // スコア表示は変更時のみ更新
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
    this.scene.dispose();
  }
}
