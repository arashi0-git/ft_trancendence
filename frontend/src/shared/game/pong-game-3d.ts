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
import { GameManagerService } from "../services/game-manager.service";

interface PongGameOptions {
  fieldColorHex?: string;
  ballColorHex?: string;
  paddleColorHex?: string;
  paddleLength?: PaddleLengthSetting;
  ballSize?: BallSizeSetting;
  ballSpeed?: BallSpeedSetting;
  maxScore?: number;
  playerNames?: {
    player1?: string;
    player2?: string;
    player3?: string;
    player4?: string;
  };
}

const DEFAULT_FIELD_COLOR_HEX = "#245224";
const DEFAULT_BALL_COLOR_HEX = "#ffffff";
const DEFAULT_PADDLE_COLOR_HEX = "#ffffff";
const DEFAULT_MAX_SCORE = 5;
const MIN_MAX_SCORE = 3;
const MAX_MAX_SCORE = 10;
const COLOR_HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const BASE_PADDLE_HEIGHT = 80;
const BASE_BALL_RADIUS = 8;
const BASE_BALL_SPEED = 9;
const BASE_PADDLE_SPEED = 6;
const INITIAL_BALL_SPEED_FACTOR = 0.5;
const INITIAL_SERVE_SPEED = BASE_BALL_SPEED * INITIAL_BALL_SPEED_FACTOR;

type PaddleLengthSetting = "short" | "normal" | "long";
type BallSizeSetting = "small" | "normal" | "big";
type BallSpeedSetting = "slow" | "normal" | "fast";

const PADDLE_LENGTH_MULTIPLIERS: Record<PaddleLengthSetting, number> = {
  short: 0.5,
  normal: 1,
  long: 4 / 3,
};

const BALL_SIZE_MULTIPLIERS: Record<BallSizeSetting, number> = {
  small: 0.75,
  normal: 1,
  big: 2,
};

const BALL_SPEED_MULTIPLIERS: Record<BallSpeedSetting, number> = {
  slow: 0.6,
  normal: 1,
  fast: 1.2,
};

const isValidColorHex = (value: string | undefined): value is string =>
  typeof value === "string" && COLOR_HEX_PATTERN.test(value);

export class PongGame3D {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private renderer: BabylonRender;
  private gameState!: GameState;
  private config: GameConfig;
  private keyState: KeyState = {};
  private eventListeners: {
    onScoreUpdate?: Array<(score: Score) => void>;
    onGameEnd?: Array<
      (data: { winner: number; score1: number; score2: number }) => void
    >;
    onGameStateChange?: Array<(state: GameState) => void>;
  } = {};
  private isAiMode: boolean = false;
  private aiPlayers: {
    player1: boolean;
    player2: boolean;
    player3: boolean;
    player4: boolean;
  } = {
    player1: false,
    player2: false,
    player3: false,
    player4: false,
  }; // AIプレイヤー管理
  private gameManager: GameManagerService | null = null;
  private animationId: number | null = null;
  private boundHandleResize: () => void;
  private playerCount: number;
  private fieldColorHex: string;
  private ballColorHex: string;
  private paddleColorHex: string;
  private paddleLengthSetting: PaddleLengthSetting;
  private ballSizeSetting: BallSizeSetting;
  private ballSpeedSetting: BallSpeedSetting;
  private maxScoreSetting: number;
  private isBallAtFullSpeed: boolean = false;
  private playerNames: {
    player1?: string;
    player2?: string;
    player3?: string;
    player4?: string;
  };

  constructor(
    canvas: HTMLCanvasElement,
    playerCount: number = 2,
    options: PongGameOptions = {},
  ) {
    this.canvas = canvas;
    this.playerCount = playerCount;
    this.engine = new Engine(canvas, true);
    this.boundHandleResize = this.handleResize.bind(this);
    this.fieldColorHex = isValidColorHex(options.fieldColorHex)
      ? options.fieldColorHex
      : DEFAULT_FIELD_COLOR_HEX;
    this.ballColorHex = isValidColorHex(options.ballColorHex)
      ? options.ballColorHex
      : DEFAULT_BALL_COLOR_HEX;
    this.paddleColorHex = isValidColorHex(options.paddleColorHex)
      ? options.paddleColorHex
      : DEFAULT_PADDLE_COLOR_HEX;
    this.paddleLengthSetting = this.normalizePaddleLength(options.paddleLength);
    this.ballSizeSetting = this.normalizeBallSize(options.ballSize);
    this.ballSpeedSetting = this.normalizeBallSpeed(options.ballSpeed);
    this.maxScoreSetting = this.normalizeMaxScore(options.maxScore);
    this.playerNames = options.playerNames || {};

    // レスポンシブサイズを計算
    const { width, height } = this.calculateResponsiveSize();
    this.config = {
      canvasWidth: width,
      canvasHeight: height,
      paddleWidth: 10,
      paddleHeight: this.calculatePaddleHeight(this.paddleLengthSetting),
      paddleSpeed: this.calculatePaddleSpeed(this.ballSpeedSetting),
      ballRadius: this.calculateBallRadius(this.ballSizeSetting),
      ballSpeed: this.calculateBallSpeed(this.ballSpeedSetting),
      maxScore: this.maxScoreSetting,
    };

    this.canvas.width = this.config.canvasWidth;
    this.canvas.height = this.config.canvasHeight;

    // ウィンドウリサイズ時の処理
    window.addEventListener("resize", this.boundHandleResize);

    this.renderer = new BabylonRender(
      this.engine,
      this.config.canvasWidth,
      this.config.canvasHeight,
      {
        withBackground: true,
        fieldColorHex: this.fieldColorHex,
        ballColorHex: this.ballColorHex,
        paddleColorHex: this.paddleColorHex,
        ballRadius: this.config.ballRadius,
        player1Name: this.playerNames.player1,
        player2Name: this.playerNames.player2,
        player3Name: this.playerNames.player3,
        player4Name: this.playerNames.player4,
      },
    );

    this.initializeGame();
    this.setupEventListeners();

    // シーン準備完了を待ってからレンダリングループ開始
    this.renderer.onReady(() => {
      if (this.engine.isDisposed) {
        return;
      }
      this.engine.runRenderLoop(() => {
        if (!this.renderer.isReady()) {
          return;
        }
        this.renderer.render();
      });
    });
  }

  private initializeGame(): void {
    const PADDLE_HEIGHT = this.config.paddleHeight;
    const PADDLE_HALF_HEIGHT = this.config.paddleHeight / 2;

    // 既存のPongGameと同じ初期化処理をコピー
    const player1: Player = {
      id: 1,
      name: this.playerNames.player1,
      paddle: {
        x: 20,
        y: this.config.canvasHeight / 2 - PADDLE_HALF_HEIGHT,
        width: this.config.paddleWidth,
        height: PADDLE_HEIGHT,
        speed: this.config.paddleSpeed,
        minY: 0,
        maxY: this.config.canvasHeight - PADDLE_HEIGHT,
      },
      keys: { up: "KeyW", down: "KeyS" },
    };

    const player2: Player = {
      id: 2,
      name: this.playerNames.player2,
      paddle: {
        x: this.config.canvasWidth - 30,
        y: this.config.canvasHeight / 2 - PADDLE_HALF_HEIGHT,
        width: this.config.paddleWidth,
        height: PADDLE_HEIGHT,
        speed: this.config.paddleSpeed,
        minY: 0,
        maxY: this.config.canvasHeight - PADDLE_HEIGHT,
      },
      keys: {
        up: "ArrowUp",
        down: "ArrowDown",
      },
    };

    let player3: Player | null = null;
    let player4: Player | null = null;

    if (this.playerCount === 4) {
      const innerLeftX = this.config.canvasWidth / 4;
      player3 = {
        id: 3,
        name: this.playerNames.player3,
        paddle: {
          x: innerLeftX,
          y: this.config.canvasHeight / 2 - PADDLE_HALF_HEIGHT,
          width: this.config.paddleWidth,
          height: PADDLE_HEIGHT,
          speed: this.config.paddleSpeed,
          minY: 0,
          maxY: this.config.canvasHeight - PADDLE_HEIGHT,
        },
        keys: { up: "KeyR", down: "KeyF" },
      };

      const innerRightX = (this.config.canvasWidth / 4) * 3;
      player4 = {
        id: 4,
        name: this.playerNames.player4,
        paddle: {
          x: innerRightX,
          y: this.config.canvasHeight / 2 - PADDLE_HALF_HEIGHT,
          width: this.config.paddleWidth,
          height: PADDLE_HEIGHT,
          speed: this.config.paddleSpeed,
          minY: 0,
          maxY: this.config.canvasHeight - PADDLE_HEIGHT,
        },
        keys: { up: "KeyI", down: "KeyK" },
      };
    }

    const ball: Ball = {
      x: this.config.canvasWidth / 2,
      y: this.config.canvasHeight / 2,
      radius: this.config.ballRadius,
      velocityX: 0,
      velocityY: 0,
      speed: INITIAL_SERVE_SPEED,
    };

    const score: Score = {
      player1: 0,
      player2: 0,
      maxScore: this.config.maxScore,
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
    this.isBallAtFullSpeed = false;

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
    "KeyW",
    "KeyS",
    "KeyR",
    "KeyF",
    "KeyI",
    "KeyK",
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

  // AIプレイヤー設定メソッドを追加
  public setAiPlayers(aiPlayers: {
    player1?: boolean;
    player2?: boolean;
    player3?: boolean;
    player4?: boolean;
  }): void {
    this.aiPlayers.player1 = aiPlayers.player1 || false;
    this.aiPlayers.player2 = aiPlayers.player2 || false;
    this.aiPlayers.player3 = aiPlayers.player3 || false;
    this.aiPlayers.player4 = aiPlayers.player4 || false;
  }

  public setGameManager(gameManager: GameManagerService): void {
    this.gameManager = gameManager;
  }

  public moveAiPaddle(deltaY: number, playerNumber: 1 | 2 | 3 | 4 = 2): void {
    if (!this.isAiMode) return;

    let player: Player | null = null;
    switch (playerNumber) {
      case 1:
        player = this.gameState.player1;
        break;
      case 2:
        player = this.gameState.player2;
        break;
      case 3:
        player = this.gameState.player3 || null;
        break;
      case 4:
        player = this.gameState.player4 || null;
        break;
      default:
        return;
    }

    if (!player) return;

    const paddle = player.paddle;
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

    // Player 1の処理（AIでない場合のみキーボード入力を受け付ける）
    if (!this.aiPlayers.player1) {
      if (this.keyState[p1.keys.up] && p1.paddle.y > (p1.paddle.minY ?? 0)) {
        p1.paddle.y -= p1.paddle.speed;
      }
      if (
        this.keyState[p1.keys.down] &&
        p1.paddle.y < (p1.paddle.maxY ?? this.config.canvasHeight)
      ) {
        p1.paddle.y += p1.paddle.speed;
      }
    }

    // Player 2の処理（AIでない場合のみキーボード入力を受け付ける）
    const p2 = this.gameState.player2;
    if (!this.aiPlayers.player2) {
      if (this.keyState[p2.keys.up] && p2.paddle.y > (p2.paddle.minY ?? 0)) {
        p2.paddle.y -= p2.paddle.speed;
      }
      if (
        this.keyState[p2.keys.down] &&
        p2.paddle.y < (p2.paddle.maxY ?? this.config.canvasHeight)
      ) {
        p2.paddle.y += p2.paddle.speed;
      }
    }

    // 4人プレイの場合のPlayer 3と4の処理
    if (
      this.playerCount === 4 &&
      this.gameState.player3 &&
      this.gameState.player4
    ) {
      // Player 3の処理（AIでない場合のみキーボード入力を受け付ける）
      const p3 = this.gameState.player3;
      if (!this.aiPlayers.player3) {
        if (
          p3.keys.up &&
          this.keyState[p3.keys.up] &&
          p3.paddle.y > (p3.paddle.minY ?? 0)
        ) {
          p3.paddle.y -= p3.paddle.speed;
        }
        if (
          p3.keys.down &&
          this.keyState[p3.keys.down] &&
          p3.paddle.y < (p3.paddle.maxY ?? this.config.canvasHeight)
        ) {
          p3.paddle.y += p3.paddle.speed;
        }
      }

      // Player 4の処理（AIでない場合のみキーボード入力を受け付ける）
      const p4 = this.gameState.player4;
      if (!this.aiPlayers.player4) {
        if (
          p4.keys.up &&
          this.keyState[p4.keys.up] &&
          p4.paddle.y > (p4.paddle.minY ?? 0)
        ) {
          p4.paddle.y -= p4.paddle.speed;
        }
        if (
          p4.keys.down &&
          this.keyState[p4.keys.down] &&
          p4.paddle.y < (p4.paddle.maxY ?? this.config.canvasHeight)
        ) {
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
    const ballTop = ball.y - ballRadius;
    const ballBottom = ball.y + ballRadius;

    if (ball.velocityX < 0) {
      if (p3) {
        const p3Right = p3.x + p3.width;
        const p3Top = p3.y;
        const p3Bottom = p3.y + p3.height;
        const currentBallLeft = ball.x - ballRadius;
        const currentBallRight = ball.x + ballRadius;

        if (
          currentBallLeft <= p3Right &&
          currentBallRight >= p3.x &&
          ballBottom >= p3Top &&
          ballTop <= p3Bottom
        ) {
          const paddleCenterX = p3.x + p3.width / 2;
          if (ball.x > paddleCenterX) {
            this.ensureBallAtFullSpeed();
            ball.velocityX = Math.abs(ball.velocityX);
            ball.x = p3Right + ballRadius;
            const hitPos = (ball.y - (p3Top + p3.height / 2)) / (p3.height / 2);
            this.setBallDirection(1, hitPos);
          } else {
            ball.velocityX = -Math.abs(ball.velocityX) * 0.8;
            ball.x = p3.x - ballRadius;
            ball.velocityY += (Math.random() - 0.5) * ball.speed * 0.2;
            this.ensureBallAtFullSpeed();
          }
          return;
        }
      }

      const p1Right = p1.x + p1.width;
      const p1Top = p1.y;
      const p1Bottom = p1.y + p1.height;
      const currentBallLeftP1 = ball.x - ballRadius;
      const currentBallRightP1 = ball.x + ballRadius;

      if (
        currentBallLeftP1 <= p1Right &&
        currentBallRightP1 >= p1.x &&
        ballBottom >= p1Top &&
        ballTop <= p1Bottom
      ) {
        const paddleCenterX = p1.x + p1.width / 2;
        if (ball.x > paddleCenterX) {
          this.ensureBallAtFullSpeed();
          ball.velocityX = Math.abs(ball.velocityX);
          ball.x = p1Right + ballRadius;
          const hitPos = (ball.y - (p1Top + p1.height / 2)) / (p1.height / 2);
          this.setBallDirection(1, hitPos);
        } else {
          ball.velocityX = -Math.abs(ball.velocityX) * 0.8;
          ball.x = p1.x - ballRadius;
          ball.velocityY += (Math.random() - 0.5) * ball.speed * 0.2;
          this.ensureBallAtFullSpeed();
        }
        return;
      }
    } else if (ball.velocityX > 0) {
      if (p4) {
        const p4Left = p4.x;
        const p4Top = p4.y;
        const p4Bottom = p4.y + p4.height;
        const currentBallLeftP4 = ball.x - ballRadius;
        const currentBallRightP4 = ball.x + ballRadius;

        if (
          currentBallRightP4 >= p4Left &&
          currentBallLeftP4 <= p4.x + p4.width &&
          ballBottom >= p4Top &&
          ballTop <= p4Bottom
        ) {
          const paddleCenterX = p4.x + p4.width / 2;
          if (ball.x < paddleCenterX) {
            this.ensureBallAtFullSpeed();
            ball.velocityX = -Math.abs(ball.velocityX);
            ball.x = p4Left - ballRadius;
            const hitPos = (ball.y - (p4Top + p4.height / 2)) / (p4.height / 2);
            this.setBallDirection(-1, hitPos);
          } else {
            ball.velocityX = Math.abs(ball.velocityX) * 0.8;
            ball.x = p4.x + p4.width + ballRadius;
            ball.velocityY += (Math.random() - 0.5) * ball.speed * 0.2;
            this.ensureBallAtFullSpeed();
          }
          return;
        }
      }

      const p2Left = p2.x;
      const p2Top = p2.y;
      const p2Bottom = p2.y + p2.height;
      const currentBallLeftP2 = ball.x - ballRadius;
      const currentBallRightP2 = ball.x + ballRadius;

      if (
        currentBallRightP2 >= p2Left &&
        currentBallLeftP2 <= p2.x + p2.width &&
        ballBottom >= p2Top &&
        ballTop <= p2Bottom
      ) {
        const paddleCenterX = p2.x + p2.width / 2;
        if (ball.x < paddleCenterX) {
          this.ensureBallAtFullSpeed();
          ball.velocityX = -Math.abs(ball.velocityX);
          ball.x = p2Left - ballRadius;
          const hitPos = (ball.y - (p2Top + p2.height / 2)) / (p2.height / 2);
          this.setBallDirection(-1, hitPos);
        } else {
          ball.velocityX = Math.abs(ball.velocityX) * 0.8;
          ball.x = p2.x + p2.width + ballRadius;
          ball.velocityY += (Math.random() - 0.5) * ball.speed * 0.2;
          this.ensureBallAtFullSpeed();
        }
        return;
      }
    }
  }

  private checkScore(): void {
    const ball = this.gameState.ball;
    let scored = false;
    let scoringPlayer: 1 | 2 | null = null;

    if (ball.x + ball.radius < 0) {
      this.gameState.score.player2++;
      scored = true;
      scoringPlayer = 2;
    } else if (ball.x - ball.radius > this.config.canvasWidth) {
      this.gameState.score.player1++;
      scored = true;
      scoringPlayer = 1;
    }

    if (scored) {
      const listeners = this.eventListeners.onScoreUpdate;
      (listeners || []).forEach((callback) => {
        if (callback) {
          callback(this.gameState.score);
        }
      });
      this.resetBall(scoringPlayer === 1 ? 1 : -1);
    }

    if (this.gameState.score.player1 >= this.config.maxScore) {
      this.endGame(1); // left team wins
    } else if (this.gameState.score.player2 >= this.config.maxScore) {
      this.endGame(2); // right team wins
    }
  }

  private resetBall(direction: number = 1): void {
    const ball = this.gameState.ball;
    ball.x = this.config.canvasWidth / 2;
    ball.y = this.config.canvasHeight / 2;
    ball.speed = INITIAL_SERVE_SPEED;
    this.isBallAtFullSpeed = false;
    this.setBallDirection(direction, Math.random() * 0.5 - 0.25);

    this.gameManager?.notifyAiPlayersOfBallReset();
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

  private calculateResponsiveSize(): { width: number; height: number } {
    const maxWidth = Math.min(window.innerWidth - 120, 900); // 最大900px、余白120px
    const maxHeight = Math.min(window.innerHeight - 400, 500); // 最大500px、UI用に400px確保

    // アスペクト比を維持 (2:1)
    const aspectRatio = 2;
    let width = maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    // 最小サイズを確保
    width = Math.max(width, 500);
    height = Math.max(height, 250);

    return { width: Math.floor(width), height: Math.floor(height) };
  }

  private normalizePaddleLength(
    length?: string | PaddleLengthSetting,
  ): PaddleLengthSetting {
    if (length === "short" || length === "normal" || length === "long") {
      return length;
    }
    return "normal";
  }

  private calculatePaddleHeight(length: PaddleLengthSetting): number {
    const multiplier = PADDLE_LENGTH_MULTIPLIERS[length] ?? 1;
    return Math.round(BASE_PADDLE_HEIGHT * multiplier);
  }

  private normalizeBallSize(size?: string | BallSizeSetting): BallSizeSetting {
    if (size === "small" || size === "normal" || size === "big") {
      return size;
    }
    return "normal";
  }

  private normalizeBallSpeed(
    speed?: string | BallSpeedSetting,
  ): BallSpeedSetting {
    if (speed === "slow" || speed === "normal" || speed === "fast") {
      return speed;
    }
    return "normal";
  }

  private normalizeMaxScore(value?: number): number {
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= MIN_MAX_SCORE &&
      value <= MAX_MAX_SCORE
    ) {
      return value;
    }
    return DEFAULT_MAX_SCORE;
  }

  private calculateBallRadius(size: BallSizeSetting): number {
    const multiplier = BALL_SIZE_MULTIPLIERS[size] ?? 1;
    return Math.round(BASE_BALL_RADIUS * multiplier);
  }

  private calculateBallSpeed(speed: BallSpeedSetting): number {
    const multiplier = BALL_SPEED_MULTIPLIERS[speed] ?? 1;
    return BASE_BALL_SPEED * multiplier;
  }

  private calculatePaddleSpeed(speed: BallSpeedSetting): number {
    const multiplier = BALL_SPEED_MULTIPLIERS[speed] ?? 1;
    return BASE_PADDLE_SPEED * multiplier;
  }

  private ensureBallAtFullSpeed(): void {
    if (this.isBallAtFullSpeed) {
      return;
    }

    const ball = this.gameState.ball;
    this.isBallAtFullSpeed = true;
    ball.speed = this.config.ballSpeed;
    const currentMagnitude = Math.hypot(ball.velocityX, ball.velocityY);
    if (currentMagnitude > 0) {
      const targetMagnitude = this.config.ballSpeed;
      const scale = targetMagnitude / currentMagnitude;
      ball.velocityX *= scale;
      ball.velocityY *= scale;
    }
  }

  private handleResize(): void {
    const previousWidth = this.config.canvasWidth;
    const previousHeight = this.config.canvasHeight;

    const { width, height } = this.calculateResponsiveSize();
    this.config.canvasWidth = width;
    this.config.canvasHeight = height;
    this.canvas.width = width;
    this.canvas.height = height;

    this.renderer.setGameSize(width, height);

    // ゲーム状態を新しいサイズに合わせて調整
    this.adjustGameStateToNewSize(previousWidth, previousHeight);

    // 3Dオブジェクトを更新
    this.renderer.updateGameObjects(this.gameState);

    // エンジンのリサイズ
    this.engine.resize();
  }

  private adjustGameStateToNewSize(
    previousWidth: number,
    previousHeight: number,
  ): void {
    if (!this.gameState || previousWidth <= 0 || previousHeight <= 0) {
      return;
    }

    const widthRatio = this.config.canvasWidth / previousWidth;
    const heightRatio = this.config.canvasHeight / previousHeight;

    const clamp = (value: number, min: number, max: number): number =>
      Math.min(Math.max(value, min), max);

    const updatePaddlePosition = (player?: Player | null): void => {
      if (!player) return;

      const paddle = player.paddle;
      paddle.x = Math.round(paddle.x * widthRatio);
      paddle.y = Math.round(paddle.y * heightRatio);

      paddle.minY = 0;
      paddle.maxY = Math.max(
        this.config.canvasHeight - paddle.height,
        paddle.minY,
      );

      paddle.x = clamp(paddle.x, 0, this.config.canvasWidth - paddle.width);
      paddle.y = clamp(
        paddle.y,
        paddle.minY ?? 0,
        paddle.maxY ?? this.config.canvasHeight - paddle.height,
      );
    };

    updatePaddlePosition(this.gameState.player1);
    updatePaddlePosition(this.gameState.player2);
    updatePaddlePosition(this.gameState.player3 || undefined);
    updatePaddlePosition(this.gameState.player4 || undefined);

    const ball = this.gameState.ball;
    ball.x = Math.round(ball.x * widthRatio);
    ball.y = Math.round(ball.y * heightRatio);
    // 速度は累積スケーリングではなく、config.ballSpeedに基づいて正規化
    this.ensureBallAtFullSpeed();
    ball.x = clamp(ball.x, ball.radius, this.config.canvasWidth - ball.radius);
    ball.y = clamp(ball.y, ball.radius, this.config.canvasHeight - ball.radius);
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    document.removeEventListener("keydown", this.keydownHandler);
    document.removeEventListener("keyup", this.keyupHandler);
    window.removeEventListener("resize", this.boundHandleResize);

    this.engine.dispose();
    this.renderer.dispose();
  }

  public on<E extends keyof GameEvents>(
    event: E,
    callback: GameEvents[E],
  ): void {
    if (!callback) return;

    if (event === "onScoreUpdate") {
      if (!this.eventListeners.onScoreUpdate) {
        this.eventListeners.onScoreUpdate = [];
      }
      this.eventListeners.onScoreUpdate.push(
        callback as (score: Score) => void,
      );
    } else if (event === "onGameEnd") {
      if (!this.eventListeners.onGameEnd) {
        this.eventListeners.onGameEnd = [];
      }
      this.eventListeners.onGameEnd.push(
        callback as (data: {
          winner: number;
          score1: number;
          score2: number;
        }) => void,
      );
    } else if (event === "onGameStateChange") {
      if (!this.eventListeners.onGameStateChange) {
        this.eventListeners.onGameStateChange = [];
      }
      this.eventListeners.onGameStateChange.push(
        callback as (state: GameState) => void,
      );
    }
  }

  public off<E extends keyof GameEvents>(
    event: E,
    callback: GameEvents[E],
  ): void {
    if (!callback) return;

    if (event === "onScoreUpdate" && this.eventListeners.onScoreUpdate) {
      const index = this.eventListeners.onScoreUpdate.indexOf(
        callback as (score: Score) => void,
      );
      if (index > -1) {
        this.eventListeners.onScoreUpdate.splice(index, 1);
      }
    } else if (event === "onGameEnd" && this.eventListeners.onGameEnd) {
      const index = this.eventListeners.onGameEnd.indexOf(
        callback as (data: {
          winner: number;
          score1: number;
          score2: number;
        }) => void,
      );
      if (index > -1) {
        this.eventListeners.onGameEnd.splice(index, 1);
      }
    } else if (
      event === "onGameStateChange" &&
      this.eventListeners.onGameStateChange
    ) {
      const index = this.eventListeners.onGameStateChange.indexOf(
        callback as (state: GameState) => void,
      );
      if (index > -1) {
        this.eventListeners.onGameStateChange.splice(index, 1);
      }
    }
  }

  private deepFreeze<T>(obj: T): Readonly<T> {
    if (obj === null || typeof obj !== "object") return obj as Readonly<T>;

    if (Array.isArray(obj))
      return Object.freeze(
        obj.map((v) => this.deepFreeze(v)),
      ) as unknown as Readonly<T>;

    const out: Record<string, unknown> = {};
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k))
        out[k] = this.deepFreeze(obj[k]);
    }
    return Object.freeze(out) as Readonly<T>;
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

  public setFieldColor(colorHex: string): void {
    if (!isValidColorHex(colorHex)) {
      console.warn(`PongGame3D: invalid field color '${colorHex}' ignored.`);
      return;
    }

    if (this.fieldColorHex === colorHex) {
      return;
    }

    this.fieldColorHex = colorHex;
    this.renderer.setFieldColor(colorHex);
  }

  public setBallColor(colorHex: string): void {
    if (!isValidColorHex(colorHex)) {
      console.warn(`PongGame3D: invalid ball color '${colorHex}' ignored.`);
      return;
    }

    if (this.ballColorHex === colorHex) {
      return;
    }

    this.ballColorHex = colorHex;
    this.renderer.setBallColor(colorHex);
  }

  public setPaddleColor(colorHex: string): void {
    if (!isValidColorHex(colorHex)) {
      console.warn(`PongGame3D: invalid paddle color '${colorHex}' ignored.`);
      return;
    }

    if (this.paddleColorHex === colorHex) {
      return;
    }

    this.paddleColorHex = colorHex;
    this.renderer.setPaddleColor(colorHex);
  }

  public setPaddleLength(length: PaddleLengthSetting): void {
    const normalized = this.normalizePaddleLength(length);
    if (this.paddleLengthSetting === normalized) {
      return;
    }

    this.paddleLengthSetting = normalized;
    this.config.paddleHeight = this.calculatePaddleHeight(normalized);
    this.resetGame();
  }

  public setBallSize(size: BallSizeSetting): void {
    const normalized = this.normalizeBallSize(size);
    if (this.ballSizeSetting === normalized) {
      return;
    }

    this.ballSizeSetting = normalized;
    this.config.ballRadius = this.calculateBallRadius(normalized);
    this.resetGame();
  }

  public setBallSpeed(speed: BallSpeedSetting): void {
    const normalized = this.normalizeBallSpeed(speed);
    if (this.ballSpeedSetting === normalized) {
      return;
    }

    this.ballSpeedSetting = normalized;
    this.config.ballSpeed = this.calculateBallSpeed(normalized);
    this.config.paddleSpeed = this.calculatePaddleSpeed(normalized);
    this.resetGame();
  }

  public setMaxScore(maxScore: number): void {
    const normalized = this.normalizeMaxScore(maxScore);
    if (this.maxScoreSetting === normalized) {
      return;
    }

    this.maxScoreSetting = normalized;
    this.config.maxScore = normalized;
    this.resetGame();
  }
}
