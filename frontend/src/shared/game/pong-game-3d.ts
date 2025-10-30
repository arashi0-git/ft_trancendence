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
  private playerCount: number;

  constructor(canvas: HTMLCanvasElement, playerCount: number = 2) {
    this.canvas = canvas;
    this.playerCount = playerCount;
    console.log(`PongGame3D created for ${this.playerCount} players.`); // just for control
    this.engine = new Engine(canvas, true);

    this.config = {
      canvasWidth: 800,
      canvasHeight: 400,
      paddleWidth: 10,
      paddleHeight: 80,
      paddleSpeed: 5,
      ballRadius: 8,
      ballSpeed: 11,
      maxScore: 5,
    };

    this.canvas.width = this.config.canvasWidth;
    this.canvas.height = this.config.canvasHeight;

    this.renderer = new BabylonRender(this.engine, this.playerCount);
    this.initializeGame();
    this.setupEventListeners();

    // レンダリングループ開始
    this.engine.runRenderLoop(() => {
      this.renderer.render();
    });
  }

  private initializeGame(): void {
    const PADDLE_HEIGHT = this.config.paddleHeight;
    const PADDLE_HALF_HEIGHT = this.config.paddleHeight / 2;
    // 既存のPongGameと同じ初期化処理をコピー
    const player1: Player = {
      id: 1,
      paddle: {
        x: 20,
        y: this.config.canvasHeight / 2 - PADDLE_HALF_HEIGHT,
        width: this.config.paddleWidth,
        height: PADDLE_HEIGHT,
        speed: this.config.paddleSpeed,
        minX: 10,
        maxX: 30,
        minY: 0,
        maxY: this.config.canvasHeight - PADDLE_HEIGHT,
      },
      keys: { up: "KeyW", down: "KeyS" },
    };

    const player2: Player = {
      id: 2,
      paddle: {
        x: this.config.canvasWidth - 30, // Úplně vpravo
        y: this.config.canvasHeight / 2 - PADDLE_HALF_HEIGHT, // Střed
        width: this.config.paddleWidth,
        height: PADDLE_HEIGHT, // Plná výška
        speed: this.config.paddleSpeed,
        minX: this.config.canvasWidth - 40, // Pevná X pozice
        maxX: this.config.canvasWidth - 20, // Pevná X pozice
        minY: 0, // Celá výška
        maxY: this.config.canvasHeight - PADDLE_HEIGHT, // Celá výška
      },
      keys: { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }, // Left/Right asi nebudeme potřebovat
    };

    let player3: Player | null = null;
    let player4: Player | null = null;

    if (this.playerCount === 4) {
      const innerLeftX = this.config.canvasWidth / 4; // Vypočítáme X pozici
      player3 = {
        id: 3,
        paddle: {
          x: innerLeftX, // Správná X pozice
          y: this.config.canvasHeight / 2 - PADDLE_HALF_HEIGHT, // Střed (jako ostatní)
          width: this.config.paddleWidth,
          height: PADDLE_HEIGHT, // !!! Plná výška (ne poloviční)
          speed: this.config.paddleSpeed,
          minX: innerLeftX - 10, // Pevná X (nebo malý rozsah)
          maxX: innerLeftX + 10, // Pevná X (nebo malý rozsah)
          minY: 0, // Celá výška
          maxY: this.config.canvasHeight - PADDLE_HEIGHT, // Celá výška
        },
        keys: { up: "KeyR", down: "KeyF" }, // Odstraněno Left/Right
      };
      const innerRightX = (this.config.canvasWidth / 4) * 3;
      player4 = {
        id: 4,
        paddle: {
          x: innerRightX,
          y: this.config.canvasHeight / 2 - PADDLE_HALF_HEIGHT, // Střed
          width: this.config.paddleWidth,
          height: PADDLE_HEIGHT, // Plná výška
          speed: this.config.paddleSpeed,
          minX: innerRightX - 10, // Pevná X pozice
          maxX: innerRightX + 10, // Pevná X pozice
          minY: 0, // Celá výška
          maxY: this.config.canvasHeight - PADDLE_HEIGHT, // Celá výška
        },
        keys: { up: "KeyI", down: "KeyK"}, // Příklad
      };
    }

    const ball: Ball = {
      x: this.config.canvasWidth / 2,
      y: this.config.canvasHeight / 2,
      radius: this.config.ballRadius,
      velocityX: 0,
      velocityY: 0,
      speed: this.config.ballSpeed * 0.5,
    };
    console.log("P3D: Ball object created:", JSON.stringify(ball));

    const score: Score = {
      player1: 0,
      player2: 0,
      maxScore: this.config.maxScore
    };

    this.gameState = {
      player1,
      player2,
      player3: player3,
      player4: player4,
      ball,
      score,
      gameStatus: "waiting",
    };
    console.log("P3D: Ball velocity after setBallDirection:", this.gameState.ball.velocityX, this.gameState.ball.velocityY);
    this.renderer.initializeScene(this.gameState);

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
      const listeners = this.eventListeners.onGameStateChange;
      (listeners || []).forEach((callback) => {
        if (callback) {
          callback(this.getReadonlyGameState());
        }
      });
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
    // P1 - Pohyb nahoru/dolů
    // --- OPRAVA ZDE: Přidán operátor '??' pro ošetření 'undefined' ---
    if (this.keyState[p1.keys.up] && p1.paddle.y > (p1.paddle.minY ?? 0)) {
      p1.paddle.y -= p1.paddle.speed;
    }
    if (this.keyState[p1.keys.down] && p1.paddle.y < (p1.paddle.maxY ?? this.config.canvasHeight)) {
      p1.paddle.y += p1.paddle.speed;
    }
  
    if (!this.isAiMode) {
      const p2 = this.gameState.player2;
      if (this.keyState[p2.keys.up] && p2.paddle.y > (p2.paddle.minY ?? 0)) {
        p2.paddle.y -= p2.paddle.speed;
      }
      if (this.keyState[p2.keys.down] && p2.paddle.y < (p2.paddle.maxY ?? this.config.canvasHeight)) {
        p2.paddle.y += p2.paddle.speed;
      }

      if (this.playerCount === 4 && this.gameState.player3 && this.gameState.player4) {
        const p3 = this.gameState.player3;
        if (p3.keys.up && this.keyState[p3.keys.up] && p3.paddle.y > (p3.paddle.minY ?? 0)) {
          p3.paddle.y -= p3.paddle.speed;
        }
        if (p3.keys.down && this.keyState[p3.keys.down] && p3.paddle.y < (p3.paddle.maxY ?? this.config.canvasHeight)) {
          p3.paddle.y += p3.paddle.speed;
        }

        const p4 = this.gameState.player4;
        if (p4.keys.up && this.keyState[p4.keys.up] && p4.paddle.y > (p4.paddle.minY ?? 0)) {
          p4.paddle.y -= p4.paddle.speed;
        }
        if (p4.keys.down && this.keyState[p4.keys.down] && p4.paddle.y < (p4.paddle.maxY ?? this.config.canvasHeight)) {
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
  // Budeme počítat až při kontrole
  const ballTop = ball.y - ballRadius;
  const ballBottom = ball.y + ballRadius;

  // --- Kolize s levou stranou (P1 a P3) ---
  if (ball.velocityX < 0) { // Míček letí doleva

    // Kolize s P3 (vnitřní levá pálka) - pouze pro 4 hráče
    if (p3) {
        const p3Right = p3.x + p3.width; const p3Top = p3.y; const p3Bottom = p3.y + p3.height;
        const currentBallLeft = ball.x - ballRadius; const currentBallRight = ball.x + ballRadius;
        if (currentBallLeft <= p3Right && currentBallRight >= p3.x && ballBottom >= p3Top && ballTop <= p3Bottom) {
           // console.log("%cP3 COLLISION DETECTED!", "color: orange; font-weight: bold;");
           const paddleCenterX = p3.x + p3.width / 2;
           if (ball.x > paddleCenterX) { // Zásah PRAVÉ (vnitřní) strany -> odraz doprava
             // console.log("--> P3 Hit INNER side");
             ball.velocityX = Math.abs(ball.velocityX);
             ball.x = p3Right + ballRadius;
             const hitPos = (ball.y - (p3Top + p3.height / 2)) / (p3.height / 2);
             this.setBallDirection(1, hitPos);
           } else { // Zásah LEVÉ (zadní) strany -> odraz DOLEVA
              // console.log("--> P3 Hit OUTER side");
              ball.velocityX = -Math.abs(ball.velocityX) * 0.8; // Malý odraz doleva
              ball.x = p3.x - ballRadius;
              ball.velocityY += (Math.random() - 0.5) * ball.speed * 0.2;
           }
           // console.log(`--> P3 After Collision: ballX=${ball.x.toFixed(1)}, velocityX=${ball.velocityX.toFixed(1)}`);
           return; // Kolize vyřešena
        }
    } // Konec kontroly P3

    // Kolize s P1 (vnější levá pálka)
    const p1Right = p1.x + p1.width; const p1Top = p1.y; const p1Bottom = p1.y + p1.height;
    const currentBallLeftP1 = ball.x - ballRadius; const currentBallRightP1 = ball.x + ballRadius;
    if (currentBallLeftP1 <= p1Right && currentBallRightP1 >= p1.x && ballBottom >= p1Top && ballTop <= p1Bottom) {
      const paddleCenterX = p1.x + p1.width / 2;
      // console.log(`P1 Collision! ball.x=${ball.x.toFixed(1)}, paddleCenterX=${paddleCenterX.toFixed(1)}`);
      if (ball.x > paddleCenterX) { // Zásah PRAVÉ (vnitřní) strany -> odraz doprava
        // console.log("-> Hit INNER side (right)");
        ball.velocityX = Math.abs(ball.velocityX);
        ball.x = p1Right + ballRadius;
        const hitPos = (ball.y - (p1Top + p1.height / 2)) / (p1.height / 2);
        this.setBallDirection(1, hitPos);
      } else { // Zásah LEVÉ (zadní) strany -> odraz DOLEVA
        // console.log("-> Hit OUTER side (left)");
        ball.velocityX = -Math.abs(ball.velocityX) * 0.8; // Malý odraz doleva
        ball.x = p1.x - ballRadius;
        ball.velocityY += (Math.random() - 0.5) * ball.speed * 0.2;
      }
      return; // Kolize vyřešena
    } // Konec kontroly P1

  } // Konec if (ball.velocityX < 0)

  // --- Kolize s pravou stranou (P2 a P4) ---
  else if (ball.velocityX > 0) { // Míček letí doprava

     // Kolize s P4 (vnitřní pravá pálka)
     if (p4) {
        const p4Left = p4.x; const p4Top = p4.y; const p4Bottom = p4.y + p4.height;
        const currentBallLeftP4 = ball.x - ballRadius; const currentBallRightP4 = ball.x + ballRadius;
         if (currentBallRightP4 >= p4Left && currentBallLeftP4 <= p4.x + p4.width && ballBottom >= p4Top && ballTop <= p4Bottom) {
            // console.log("%cP4 COLLISION DETECTED!", "color: cyan; font-weight: bold;");
            const paddleCenterX = p4.x + p4.width / 2;
            if (ball.x < paddleCenterX) { // Zásah LEVÉ (vnitřní) strany -> odraz doleva
               // console.log("--> P4 Hit INNER side");
               ball.velocityX = -Math.abs(ball.velocityX);
               ball.x = p4Left - ballRadius;
               const hitPos = (ball.y - (p4Top + p4.height / 2)) / (p4.height / 2);
               this.setBallDirection(-1, hitPos);
            } else { // Zásah PRAVÉ (zadní) strany -> odraz DOPRAVA
               // console.log("--> P4 Hit OUTER side");
               ball.velocityX = Math.abs(ball.velocityX) * 0.8; // Malý odraz doprava
               ball.x = p4.x + p4.width + ballRadius;
               ball.velocityY += (Math.random() - 0.5) * ball.speed * 0.2;
            }
            // console.log(`--> P4 After Collision: ballX=${ball.x.toFixed(1)}, velocityX=${ball.velocityX.toFixed(1)}`);
            return; // Správně bez 'a'
         }
     } // Konec kontroly P4

    // Kolize s P2 (vnější pravá pálka)
    const p2Left = p2.x; const p2Top = p2.y; const p2Bottom = p2.y + p2.height;
    const currentBallLeftP2 = ball.x - ballRadius; const currentBallRightP2 = ball.x + ballRadius;
    if (currentBallRightP2 >= p2Left && currentBallLeftP2 <= p2.x + p2.width && ballBottom >= p2Top && ballTop <= p2Bottom) {
       const paddleCenterX = p2.x + p2.width / 2;
       if (ball.x < paddleCenterX) { // Zásah LEVÉ (vnitřní) strany -> odraz doleva
          ball.velocityX = -Math.abs(ball.velocityX);
          ball.x = p2Left - ballRadius;
          const hitPos = (ball.y - (p2Top + p2.height / 2)) / (p2.height / 2);
          this.setBallDirection(-1, hitPos);
       } else { // Zásah PRAVÉ (zadní) strany -> odraz DOPRAVA
          ball.velocityX = Math.abs(ball.velocityX) * 0.8; // Malý odraz doprava
          ball.x = p2.x + p2.width + ballRadius;
          ball.velocityY += (Math.random() - 0.5) * ball.speed * 0.2;
       }
       return; // Kolize vyřešena
    } // Konec kontroly P2

  } // Konec else if (ball.velocityX > 0)
} // Konec metody

  private checkScore(): void {
    const ball = this.gameState.ball;
    let scored = false;
    let scoringPlayer: 1 | 2 | null = null;

    if (ball.x + ball.radius < 0) { // Míč za levou stranou
      this.gameState.score.player2++; // Bod pro pravý tým (P2 a P4)
      scored = true;
      scoringPlayer = 2; // Gól dal levý tým (skóruje pravý)
    } else if (ball.x - ball.radius > this.config.canvasWidth) { // Míč za pravou stranou
      this.gameState.score.player1++; // Bod pro levý tým (P1 a P3)
      scored = true;
      scoringPlayer = 1; // Gól dal pravý tým (skóruje levý)
    }

    if (scored) {
      const listeners = this.eventListeners.onScoreUpdate;
      (listeners || []).forEach((callback) => {
        if (callback) {
          callback(this.gameState.score); // Pošli aktuální skóre
        }
      });
      // Resetuj míček, pošli ho na stranu, která dostala gól
      this.resetBall(scoringPlayer === 1 ? -1 : 1);
    }

    // Kontrola konce hry zůstává stejná, protože skóre je pořád player1 vs player2
    if (this.gameState.score.player1 >= this.config.maxScore) {
      this.endGame(1); // Vyhrál levý tým
    } else if (this.gameState.score.player2 >= this.config.maxScore) {
      this.endGame(2); // Vyhrál pravý tým
    }
  }

  // Uprav resetBall, aby přijímal směr
  private resetBall(direction: number = 1): void { // Výchozí směr doprava
    const ball = this.gameState.ball;
    ball.x = this.config.canvasWidth / 2;
    ball.y = this.config.canvasHeight / 2;
    ball.speed = this.config.ballSpeed * 0.5;
    this.setBallDirection(direction, Math.random() * 0.5 - 0.25); // Menší náhodný úhel
  }


  private endGame(winner: number): void {
    this.gameState.gameStatus = "finished";
    this.gameState.winner = winner;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.keyState = {};

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

  public resetGame(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.keyState = {};
    this.initializeGame();
    this.renderer.updateGameObjects(this.gameState);
    const listeners = this.eventListeners.onGameStateChange;
    (listeners || []).forEach((callback) => {
      if (callback) {
        callback(this.getReadonlyGameState());
      }
    });
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
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
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

  public getCanvasSize(): { width: number; height: number } {
    return {
      width: this.config.canvasWidth,
      height: this.config.canvasHeight,
    };
  }
}
