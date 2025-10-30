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
  private playerCount: number;
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

  constructor(canvas: HTMLCanvasElement, playerCount: number = 2, config?: Partial<GameConfig>) {
    this.canvas = canvas;
    this.playerCount = playerCount;
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
      const listeners = this.eventListeners.onGameStateChange;
      (listeners || []).forEach((callback) => {
        if (callback) {
          callback(this.getReadonlyGameState());
        }
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
      const listeners = this.eventListeners.onGameStateChange;
      (listeners || []).forEach((callback) => {
        if (callback) {
          callback(this.getReadonlyGameState());
        }
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
    const listeners = this.eventListeners.onGameStateChange;
    (listeners || []).forEach((callback) => {
      if (callback) {
        callback(this.getReadonlyGameState());
      }
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
    // P1 - 上下移動 
    if (this.keyState[p1.keys.up] && p1.paddle.y > (p1.paddle.minY ?? 0)) {
      p1.paddle.y -= p1.paddle.speed;
    }
    if (this.keyState[p1.keys.down] && p1.paddle.y < (p1.paddle.maxY ?? this.config.canvasHeight)) {
      p1.paddle.y += p1.paddle.speed;
    }


    // AIモードではPlayer2のキー入力を無視 (
    if (!this.isAiMode) {
      const p2 = this.gameState.player2;
      // P2 - 上下移動 
      if (this.keyState[p2.keys.up] && p2.paddle.y > (p2.paddle.minY ?? 0)) {
        p2.paddle.y -= p2.paddle.speed;
      }
      if (this.keyState[p2.keys.down] && p2.paddle.y < (p2.paddle.maxY ?? this.config.canvasHeight)) {
        p2.paddle.y += p2.paddle.speed;
      }

      if (this.playerCount === 4 && this.gameState.player3 && this.gameState.player4) {
        const p3 = this.gameState.player3;
        // P3 - 上下移動 
        if (this.keyState[p3.keys.up] && p3.paddle.y > (p3.paddle.minY ?? 0)) {
          p3.paddle.y -= p3.paddle.speed;
        }
        if (this.keyState[p3.keys.down] && p3.paddle.y < (p3.paddle.maxY ?? this.config.canvasHeight)) {
          p3.paddle.y += p3.paddle.speed;
        }
        // --- 修正ここまで

        const p4 = this.gameState.player4;
        // P4 - 上下移動
        if (this.keyState[p4.keys.up] && p4.paddle.y > (p4.paddle.minY ?? 0)) {
          p4.paddle.y -= p4.paddle.speed;
        }
        if (this.keyState[p4.keys.down] && p4.paddle.y < (p4.paddle.maxY ?? this.config.canvasHeight)) {
          p4.paddle.y += p4.paddle.speed;
        }
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
    const p1 = this.gameState.player1.paddle;
    const p2 = this.gameState.player2.paddle;
    const p3 = this.playerCount === 4 ? this.gameState.player3?.paddle : null;
    const p4 = this.playerCount === 4 ? this.gameState.player4?.paddle : null;

    const ballRadius = ball.radius;
    // Odstraníme ballLeft/Right odsud, budeme je počítat až při kontrole

    const ballTop = ball.y - ballRadius;
    const ballBottom = ball.y + ballRadius;

    // --- Kolize s levou stranou (P1 a P3) ---
    if (ball.velocityX < 0) { // Míček letí doleva

      // ---> KONTROLA P3 NEJDŘÍV <---
      if (p3) {
        const p3Right = p3.x + p3.width;
        const p3Top = p3.y;
        const p3Bottom = p3.y + p3.height;
        const ballLeft = ball.x - ballRadius;
        const ballRight = ball.x + ballRadius;
        // console.log(...);
        if (ballLeft <= p3Right && ballRight >= p3.x && ballBottom >= p3Top && ballTop <= p3Bottom) {
          console.log("%cP3 COLLISION DETECTED!", "color: orange; font-weight: bold;");
          if (ball.x > p3.x + p3.width / 2) { // Zásah PRAVÉ (vnitřní) strany -> odraz doprava
            console.log("--> P3 Hit INNER side"); // <-- PŘIDEJ LOG
            ball.velocityX = Math.abs(ball.velocityX);
            ball.x = p3Right + ballRadius;
            const hitPos = (ball.y - (p3Top + p3.height / 2)) / (p3.height / 2);
            this.setBallDirection(1, hitPos);
          } else { // Zásah LEVÉ (zadní) strany -> odraz DOLEVA
            console.log("--> P3 Hit OUTER side"); // <-- PŘIDEJ LOG
            ball.velocityX = -Math.abs(ball.velocityX) * 0.8;
            ball.x = p3.x - ballRadius;
            ball.velocityY += (Math.random() - 0.5) * ball.speed * 0.2;
          }
          console.log(`--> P3 After Collision: ballX=${ball.x.toFixed(1)}, velocityX=${ball.velocityX.toFixed(1)}`); // <-- PŘIDEJ LOG
          return; // Kolize vyřešena
        }
      }// Konec kontroly P3

      // ---> KONTROLA P1 AŽ DRUHÁ <---
      const p1Right = p1.x + p1.width;
      const p1Top = p1.y;
      const p1Bottom = p1.y + p1.height;
      const ballLeftP1 = ball.x - ballRadius; // Spočítáme aktuální ballLeft
      const ballRightP1 = ball.x + ballRadius;// Spočítáme aktuální ballRight
      if (ballLeftP1 <= p1Right && ballRightP1 >= p1.x && ballBottom >= p1Top && ballTop <= p1Bottom) {
        const paddleCenterX = p1.x + p1.width / 2;
        console.log(`P1 Collision! ball.x=${ball.x.toFixed(1)}, paddleCenterX=${paddleCenterX.toFixed(1)}`);
        if (ball.x > paddleCenterX) {
          console.log("-> Hit INNER side (right)");
          ball.velocityX = Math.abs(ball.velocityX);
          ball.x = p1Right + ballRadius;
          const hitPos = (ball.y - (p1Top + p1.height / 2)) / (p1.height / 2);
          this.setBallDirection(1, hitPos);
        } else {
          console.log("-> Hit OUTER side (left)");
          ball.velocityX = -Math.abs(ball.velocityX) * 0.8;
          ball.x = p1.x - ballRadius;
          ball.velocityY += (Math.random() - 0.5) * ball.speed * 0.2;
        }
        return;
      } // Konec kontroly P1

    } // Konec bloku if (ball.velocityX < 0)

    // --- Kolize s pravou stranou (P2 a P4) ---
    else if (ball.velocityX > 0) { // Míček letí doprava

      // ---> KONTROLA P4 NEJDŘÍV <---
      if (p4) {
        const p4Left = p4.x;
        const p4Top = p4.y;
        const p4Bottom = p4.y + p4.height;
        const ballLeftP4 = ball.x - ballRadius; // Spočítáme aktuální ballLeft
        const ballRightP4 = ball.x + ballRadius;// Spočítáme aktuální ballRight
        if (ballRightP4 >= p4Left && ballLeftP4 <= p4.x + p4.width && ballBottom >= p4Top && ballTop <= p4Bottom) {
          console.log("%cP4 COLLISION DETECTED!", "color: cyan; font-weight: bold;");
          if (ball.x < p4.x + p4.width / 2) { // Zásah LEVÉ (vnitřní) strany -> odraz doleva
            ball.velocityX = -Math.abs(ball.velocityX);
            ball.x = p4Left - ballRadius;
            const hitPos = (ball.y - (p4Top + p4.height / 2)) / (p4.height / 2);
            this.setBallDirection(-1, hitPos);
          } else { // Zásah PRAVÉ (zadní) strany -> odraz DOPRAVA
            ball.velocityX = Math.abs(ball.velocityX) * 0.8;
            ball.x = p4.x + p4.width + ballRadius;
            ball.velocityY += (Math.random() - 0.5) * ball.speed * 0.2;
          }
          return;
        }
      } // Konec kontroly P4

      // ---> KONTROLA P2 AŽ DRUHÁ <---
      const p2Left = p2.x;
      const p2Top = p2.y;
      const p2Bottom = p2.y + p2.height;
      const ballLeftP2 = ball.x - ballRadius; // Spočítáme aktuální ballLeft
      const ballRightP2 = ball.x + ballRadius;// Spočítáme aktuální ballRight
      if (ballRightP2 >= p2Left && ballLeftP2 <= p2.x + p2.width && ballBottom >= p2Top && ballTop <= p2Bottom) {
        if (ball.x < p2.x + p2.width / 2) {
          ball.velocityX = -Math.abs(ball.velocityX);
          ball.x = p2Left - ballRadius;
          const hitPos = (ball.y - (p2Top + p2.height / 2)) / (p2.height / 2);
          this.setBallDirection(-1, hitPos);
        } else {
          ball.velocityX = Math.abs(ball.velocityX) * 0.8;
          ball.x = p2.x + p2.width + ballRadius;
          ball.velocityY += (Math.random() - 0.5) * ball.speed * 0.2;
        }
        return;
      } // Konec kontroly P2

    } // Konec bloku else if (ball.velocityX > 0)
  } // Konec metody

  private checkScore(): void {
    const ball = this.gameState.ball;

    if (ball.x < 0) {
      this.gameState.score.player2++;
      this.resetBall();
      const listeners = this.eventListeners.onScoreUpdate;
      (listeners || []).forEach((callback) => {
        if (callback) {
          callback(this.gameState.score);
        }
      });
    }

    if (ball.x > this.config.canvasWidth) {
      this.gameState.score.player1++;
      this.resetBall();
      const listeners = this.eventListeners.onScoreUpdate;
      (listeners || []).forEach((callback) => {
        if (callback) {
          callback(this.gameState.score);
        }
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
    const listenersState = this.eventListeners.onGameStateChange;
    (listenersState || []).forEach((callback) => {
      if (callback) {
        callback(this.getReadonlyGameState());
      }
    });
    const gameEndData = {
      winner: winner,
      score1: this.gameState.score.player1,
      score2: this.gameState.score.player2,
    };
    const listenersEnd = this.eventListeners.onGameEnd;
    (listenersEnd || []).forEach((callback) => {
      if (callback) {
        callback(gameEndData);
      }
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
    if (callback) {
      if (!this.eventListeners[event]) {
        this.eventListeners[event] = [];
      }
      this.eventListeners[event]?.push(callback);
    }
  }

  public off<E extends keyof GameEvents>(
    event: E,
    callback: GameEvents[E],
  ): void {
    if (!this.eventListeners[event] || !callback) {
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
    return this.deepFreeze(this.gameState);
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
}