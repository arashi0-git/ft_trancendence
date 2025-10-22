import { Engine } from "@babylonjs/core";
import {
  GameState,
  Player,
  Ball,
  Score,
  GameConfig,
  KeyState,
  GameEvents,
} from "../types/game";
import { BabylonRender } from "./babylon-render";

export class PongGame3D {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private renderer: BabylonRender;
  private gameState!: GameState;
  private config: GameConfig;
  private keyState: KeyState = {};
  private eventListeners: Partial<
    Record<keyof GameEvents, Array<(...args: any[]) => void>>
  > = {};
  private isAiMode: boolean = false;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement, config?: Partial<GameConfig>) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true);

    this.config = {
      canvasWidth: 800,
      canvasHeight: 400,
      paddleWidth: 10,
      paddleHeight: 80,
      paddleSpeed: 5,
      ballRadius: 8,
      ballSpeed: 8,
      maxScore: 5,
      ...config,
    };

    this.canvas.width = this.config.canvasWidth;
    this.canvas.height = this.config.canvasHeight;

    this.renderer = new BabylonRender(this.engine);
    this.initializeGame();
    this.setupEventListeners();

    // レンダリングループ開始
    this.engine.runRenderLoop(() => {
      this.renderer.render();
    });
  }

  private initializeGame(): void {
    // 既存のPongGameと同じ初期化処理をコピー
    const player1: Player = {
      id: 1,
      paddle: {
        x: 20,
        y: this.config.canvasHeight / 2 - this.config.paddleHeight / 2,
        width: this.config.paddleWidth,
        height: this.config.paddleHeight,
        speed: this.config.paddleSpeed,
        minX: 10,
        maxX: this.config.canvasWidth / 2 - 50,
      },
      keys: {
        up: "KeyW",
        down: "KeyS",
        left: "KeyA",
        right: "KeyD",
      },
    };

    const player2: Player = {
      id: 2,
      paddle: {
        x: this.config.canvasWidth - 30,
        y: this.config.canvasHeight / 2 - this.config.paddleHeight / 2,
        width: this.config.paddleWidth,
        height: this.config.paddleHeight,
        speed: this.config.paddleSpeed,
        minX: this.config.canvasWidth / 2 + 50,
        maxX: this.config.canvasWidth - 20,
      },
      keys: {
        up: "ArrowUp",
        down: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight",
      },
    };

    const ball: Ball = {
      x: this.config.canvasWidth / 2,
      y: this.config.canvasHeight / 2,
      radius: this.config.ballRadius,
      velocityX: 0,
      velocityY: 0,
      speed: this.config.ballSpeed,
    };

    const score: Score = {
      player1: 0,
      player2: 0,
      maxScore: this.config.maxScore,
    };

    this.gameState = {
      player1,
      player2,
      ball,
      score,
      gameStatus: "waiting",
    };

    this.setBallDirection(Math.random() > 0.5 ? 1 : -1, Math.random() * 2 - 1);
  }

  private setBallDirection(direction: number, offset: number = 0): void {
    const ball = this.gameState.ball;
    const normalizedDirection = direction >= 0 ? 1 : -1;
    const clampedOffset = Math.max(-1, Math.min(1, offset));
    const maxBounceAngle = Math.PI / 4;
    const angle = clampedOffset * maxBounceAngle;
    const speed = ball.speed ?? this.config.ballSpeed;

    ball.velocityX = Math.cos(angle) * speed * normalizedDirection;
    ball.velocityY = Math.sin(angle) * speed;
  }

  private readonly GAME_KEYS = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "KeyW",
    "KeyS",
    "KeyA",
    "KeyD",
  ];

  private keydownHandler = (e: KeyboardEvent) => {
    if (this.GAME_KEYS.includes(e.code)) {
      e.preventDefault();
    }
    this.keyState[e.code] = true;
  };

  private keyupHandler = (e: KeyboardEvent) => {
    if (this.GAME_KEYS.includes(e.code)) {
      e.preventDefault();
    }
    this.keyState[e.code] = false;
  };

  private setupEventListeners(): void {
    document.addEventListener("keydown", this.keydownHandler);
    document.addEventListener("keyup", this.keyupHandler);
  }

  public setAiMode(isAiMode: boolean): void {
    this.isAiMode = isAiMode;
  }

  public moveAiPaddle(deltaY: number): void {
    if (!this.isAiMode) return;

    const paddle = this.gameState.player2.paddle;
    const newY = paddle.y + deltaY;

    // 境界チェック
    if (newY >= 0 && newY <= this.config.canvasHeight - paddle.height) {
      paddle.y = newY;
    }
  }

  public startGame(): void {
    if (
      this.gameState.gameStatus === "waiting" ||
      this.gameState.gameStatus === "paused"
    ) {
      this.gameState.gameStatus = "playing";
      this.gameLoop();
    }
  }

  private gameLoop(): void {
    if (this.gameState.gameStatus !== "playing") return;

    // ゲーム状態更新
    this.update();

    // 3Dオブジェクト更新
    this.renderer.updateGameObjects(this.gameState);

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    this.updatePaddles();
    this.updateBall();
    this.checkCollisions();
    this.checkScore();
  }

  private updatePaddles(): void {
    const p1 = this.gameState.player1;

    if (this.keyState[p1.keys.up] && p1.paddle.y > 0) {
      p1.paddle.y -= p1.paddle.speed;
    }
    if (
      this.keyState[p1.keys.down] &&
      p1.paddle.y < this.config.canvasHeight - this.config.paddleHeight
    ) {
      p1.paddle.y += p1.paddle.speed;
    }

    if (this.keyState[p1.keys.left] && p1.paddle.x > p1.paddle.minX) {
      p1.paddle.x -= p1.paddle.speed;
    }
    if (this.keyState[p1.keys.right] && p1.paddle.x < p1.paddle.maxX) {
      p1.paddle.x += p1.paddle.speed;
    }

    // AIモードではPlayer2のキー入力を無視
    if (!this.isAiMode) {
      const p2 = this.gameState.player2;

      if (this.keyState[p2.keys.up] && p2.paddle.y > 0) {
        p2.paddle.y -= p2.paddle.speed;
      }
      if (
        this.keyState[p2.keys.down] &&
        p2.paddle.y < this.config.canvasHeight - this.config.paddleHeight
      ) {
        p2.paddle.y += p2.paddle.speed;
      }

      if (this.keyState[p2.keys.left] && p2.paddle.x > p2.paddle.minX) {
        p2.paddle.x -= p2.paddle.speed;
      }
      if (this.keyState[p2.keys.right] && p2.paddle.x < p2.paddle.maxX) {
        p2.paddle.x += p2.paddle.speed;
      }
    }
  }

  private updateBall(): void {
    const ball = this.gameState.ball;

    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    if (ball.y <= ball.radius) {
      ball.y = ball.radius;
      ball.velocityY = Math.abs(ball.velocityY);
    } else if (ball.y >= this.config.canvasHeight - ball.radius) {
      ball.y = this.config.canvasHeight - ball.radius;
      ball.velocityY = -Math.abs(ball.velocityY);
    }
  }

  private checkCollisions(): void {
    const ball = this.gameState.ball;
    const paddle1 = this.gameState.player1.paddle;
    const paddle2 = this.gameState.player2.paddle;

    if (
      ball.x - ball.radius <= paddle1.x + paddle1.width &&
      ball.x + ball.radius >= paddle1.x &&
      ball.y + ball.radius >= paddle1.y &&
      ball.y - ball.radius <= paddle1.y + paddle1.height &&
      ball.velocityX < 0
    ) {
      ball.velocityX = -ball.velocityX;
      ball.x = paddle1.x + paddle1.width + ball.radius;

      const paddleCenter = paddle1.y + paddle1.height / 2;
      const hitPos = (ball.y - paddleCenter) / (paddle1.height / 2);
      ball.speed = this.config.ballSpeed;
      this.setBallDirection(1, hitPos);
    }

    if (
      ball.x + ball.radius >= paddle2.x &&
      ball.x - ball.radius <= paddle2.x + paddle2.width &&
      ball.y + ball.radius >= paddle2.y &&
      ball.y - ball.radius <= paddle2.y + paddle2.height &&
      ball.velocityX > 0
    ) {
      ball.velocityX = -ball.velocityX;
      ball.x = paddle2.x - ball.radius;

      const paddleCenter = paddle2.y + paddle2.height / 2;
      const hitPos = (ball.y - paddleCenter) / (paddle2.height / 2);
      ball.speed = this.config.ballSpeed;
      this.setBallDirection(-1, hitPos);
    }
  }

  private checkScore(): void {
    const ball = this.gameState.ball;

    if (ball.x < 0) {
      this.gameState.score.player2++;
      this.resetBall();
      this.eventListeners.onScoreUpdate?.forEach((callback) => {
        callback(this.gameState.score);
      });
    }

    if (ball.x > this.config.canvasWidth) {
      this.gameState.score.player1++;
      this.resetBall();
      this.eventListeners.onScoreUpdate?.forEach((callback) => {
        callback(this.gameState.score);
      });
    }

    if (this.gameState.score.player1 >= this.config.maxScore) {
      this.endGame(1);
    } else if (this.gameState.score.player2 >= this.config.maxScore) {
      this.endGame(2);
    }
  }

  private resetBall(): void {
    const ball = this.gameState.ball;
    ball.x = this.config.canvasWidth / 2;
    ball.y = this.config.canvasHeight / 2;
    ball.speed = this.config.ballSpeed * 0.5;
    this.setBallDirection(Math.random() > 0.5 ? 1 : -1, Math.random() * 2 - 1);
  }

  private endGame(winner: number): void {
    this.gameState.gameStatus = "finished";
    this.gameState.winner = winner;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.keyState = {};
    this.eventListeners.onGameEnd?.forEach((callback) => {
      callback(winner);
    });
  }

  public pauseGame(): void {
    if (this.gameState.gameStatus === "playing") {
      this.gameState.gameStatus = "paused";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }
  }

  public resetGame(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.keyState = {};
    this.initializeGame();
    this.renderer.updateGameObjects(this.gameState);
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    document.removeEventListener("keydown", this.keydownHandler);
    document.removeEventListener("keyup", this.keyupHandler);
    this.engine.dispose();
    this.renderer.dispose();
  }

  public on<E extends keyof GameEvents>(
    event: E,
    callback: GameEvents[E],
  ): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event]?.push(callback);
  }

  public off<E extends keyof GameEvents>(
    event: E,
    callback: GameEvents[E],
  ): void {
    if (!this.eventListeners[event]) {
      return;
    }
    const index = this.eventListeners[event]?.indexOf(callback) ?? -1;
    if (index > -1) {
      this.eventListeners[event]?.splice(index, 1);
    }
  }

  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepClone(item)) as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  public getGameState(): GameState {
    return this.deepClone(this.gameState);
  }

  public getReadonlyGameState(): Readonly<GameState> {
    return { ...this.gameState };
  }

  public getCanvasSize(): { width: number; height: number } {
    return {
      width: this.config.canvasWidth,
      height: this.config.canvasHeight,
    };
  }
}
