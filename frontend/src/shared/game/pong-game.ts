import {
  GameState,
  Player,
  Ball,
  Paddle,
  Score,
  GameConfig,
  KeyState,
  GameEvents,
} from "../types/game";

export class PongGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState!: GameState;
  private config: GameConfig;
  private keyState: KeyState = {};
  private animationId: number | null = null;
  private eventListeners: Partial<
    Record<keyof GameEvents, Array<(...args: any[]) => void>>
  > = {};
  private isAiMode: boolean = false;
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

  constructor(canvas: HTMLCanvasElement, config?: Partial<GameConfig>) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D rendering context");
    }
    this.ctx = ctx;

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

    this.initializeGame();
    this.setupEventListeners();
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

  private initializeGame(): void {
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

  private keydownHandler = (e: KeyboardEvent) => {
    if (this.GAME_KEYS.includes(e.code)) {
      e.preventDefault(); // ブラウザのデフォルト動作を防ぐ
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

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    document.removeEventListener("keydown", this.keydownHandler);
    document.removeEventListener("keyup", this.keyupHandler);
  }

  public startGame(): void {
    if (
      this.gameState.gameStatus === "waiting" ||
      this.gameState.gameStatus === "paused"
    ) {
      this.gameState.gameStatus = "playing";
      this.eventListeners.onGameStateChange?.forEach((callback) => {
        callback(this.getReadonlyGameState());
      });
      this.gameLoop();
    }
  }

  public pauseGame(): void {
    if (this.gameState.gameStatus === "playing") {
      this.gameState.gameStatus = "paused";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.eventListeners.onGameStateChange?.forEach((callback) => {
        callback(this.getReadonlyGameState());
      });
    }
  }

  private resetKeyState(): void {
    this.keyState = {};
  }

  public resetGame(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.resetKeyState();
    this.initializeGame();
    this.eventListeners.onGameStateChange?.forEach((callback) => {
      callback(this.getReadonlyGameState());
    });
    this.render();
  }

  private gameLoop(): void {
    if (this.gameState.gameStatus !== "playing") return;

    this.update();
    this.render();

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

  private endGame(winner: number): void {
    this.gameState.gameStatus = "finished";
    this.gameState.winner = winner;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.resetKeyState();
    this.eventListeners.onGameStateChange?.forEach((callback) => {
      callback(this.getReadonlyGameState());
    });
    this.eventListeners.onGameEnd?.forEach((callback) => {
      callback(winner);
    });
  }

  private render(): void {
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);

    this.ctx.setLineDash([5, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.config.canvasWidth / 2, 0);
    this.ctx.lineTo(this.config.canvasWidth / 2, this.config.canvasHeight);
    this.ctx.strokeStyle = "#fff";
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = "#fff";
    this.drawPaddle(this.gameState.player1.paddle);
    this.drawPaddle(this.gameState.player2.paddle);

    this.drawBall(this.gameState.ball);

    this.drawScore();
  }

  private drawPaddle(paddle: Paddle): void {
    this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  }

  private drawBall(ball: Ball): void {
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawScore(): void {
    this.ctx.font = "48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#fff";

    this.ctx.fillText(
      this.gameState.score.player1.toString(),
      this.config.canvasWidth / 4,
      60,
    );

    this.ctx.fillText(
      this.gameState.score.player2.toString(),
      (this.config.canvasWidth * 3) / 4,
      60,
    );
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

  private deepFreeze<T>(obj: T): Readonly<T> {
    if (obj === null || typeof obj !== "object") return obj as Readonly<T>;
    if (Array.isArray(obj))
      return Object.freeze(
        obj.map((v) => this.deepFreeze(v)),
      ) as unknown as Readonly<T>;
    const out: any = {};
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k))
        out[k] = this.deepFreeze((obj as any)[k]);
    }
    return Object.freeze(out);
  }

  public getReadonlyGameState(): Readonly<GameState> {
    return this.deepFreeze(this.deepClone(this.gameState));
  }

  public getCanvasSize(): { width: number; height: number } {
    return {
      width: this.config.canvasWidth,
      height: this.config.canvasHeight,
    };
  }
}
