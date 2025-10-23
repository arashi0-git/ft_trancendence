import type { GameManagerService } from "../../shared/services/game-manager.service";
import type { GameState } from "../../shared/types/game";

export type AiDifficulty = "easy" | "medium" | "hard";

interface AiConfig {
  reactionTime: number; // 反応時間(ms)
  predictionAccuracy: number; // 予測精度(0-1)
  missRate: number; // ミス率(0-1)
  updateInterval: number; // 更新間隔(ms) 1秒
}

interface PredictedPosition {
  x: number;
  y: number;
  time: number;
}

export class AiPlayer {
  private gameManager: GameManagerService | null = null;
  private config: AiConfig;
  private updateTimer: number | null = null;
  private moveTimer: number | null = null;
  private reactionTimer: number | null = null;
  private targetY: number = 0;
  private isActive: boolean = false;
  private isMoving: boolean = false;
  private currentDirection: "up" | "down" | "none" = "none";

  private readonly difficultyConfigs: Record<AiDifficulty, AiConfig> = {
    easy: {
      reactionTime: 500, // 反応を遅く
      predictionAccuracy: 0.4, // 予測精度を下げる
      missRate: 0.5, // ミス率を上げる
      updateInterval: 1000, // 更新間隔 1秒
    },
    medium: {
      reactionTime: 300, // 適度な反応時間
      predictionAccuracy: 0.65, // 適度な予測精度
      missRate: 0.25, // 適度なミス率
      updateInterval: 1000, // 更新間隔 1秒
    },
    hard: {
      reactionTime: 200, // 速い反応（無理ゲーを避ける）
      predictionAccuracy: 0.8, // 高い予測精度（完璧ではない）
      missRate: 0.1, // 低いミス率（たまにミス）
      updateInterval: 1000, // 更新間隔 1秒
    },
  };

  constructor(difficulty: AiDifficulty = "medium") {
    this.config = this.difficultyConfigs[difficulty];
  }

  start(gameManager: GameManagerService): void {
    console.log("AiPlayer: Starting with gameManager", gameManager);
    this.gameManager = gameManager;
    this.isActive = true;
    this.startUpdateLoop();
  }

  pause(): void {
    this.isActive = false;
    this.stopUpdateLoop();
    this.clearReactionTimer();
  }

  stop(): void {
    this.isActive = false;
    this.stopUpdateLoop();
    this.clearReactionTimer();
    this.stopMovement();
  }

  reset(): void {
    this.stop();
    this.clearReactionTimer();
    this.targetY = 0;
    this.currentDirection = "none";
  }

  setDifficulty(difficulty: AiDifficulty): void {
    this.config = this.difficultyConfigs[difficulty];
  }

  private startUpdateLoop(): void {
    this.stopUpdateLoop();

    console.log(
      "AiPlayer: Starting update loop with interval",
      this.config.updateInterval,
    );

    this.updateTimer = window.setInterval(() => {
      if (this.isActive && this.gameManager) {
        console.log("AiPlayer: Update loop tick");
        this.updateAI();
      }
    }, this.config.updateInterval);
  }

  private stopUpdateLoop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private clearReactionTimer(): void {
    if (this.reactionTimer) {
      clearTimeout(this.reactionTimer);
      this.reactionTimer = null;
    }
  }

  private stopMovement(): void {
    if (this.moveTimer) {
      clearInterval(this.moveTimer);
      this.moveTimer = null;
    }
    this.isMoving = false;
    this.currentDirection = "none";
  }

  private updateAI(): void {
    if (!this.gameManager) return;

    const gameState = this.gameManager.getGameState();
    if (!gameState || gameState.gameStatus !== "playing") return;

    console.log(
      `AI Update: Ball at (${gameState.ball.x}, ${gameState.ball.y}), velocity: (${gameState.ball.velocityX}, ${gameState.ball.velocityY})`,
    );
    console.log(`AI Paddle at: ${gameState.player2.paddle.y}`);

    const predictedPosition = this.predictBallPosition(gameState);

    const shouldMiss = Math.random() < this.config.missRate;
    if (shouldMiss) {
      // ミスする場合は、予測位置から少しずらす
      const missOffset = (Math.random() - 0.5) * 80;
      this.targetY = predictedPosition.y + missOffset;
    } else {
      // パドルの中央で打てるように調整
      this.targetY = predictedPosition.y - gameState.player2.paddle.height / 2;
    }

    console.log(
      `AI Target Y: ${this.targetY}, Predicted Y: ${predictedPosition.y}`,
    );

    this.clearReactionTimer();
    this.reactionTimer = window.setTimeout(() => {
      this.executeMovement();
      this.reactionTimer = null;
    }, this.config.reactionTime);
  }

  private predictBallPosition(gameState: GameState): PredictedPosition {
    const ball = gameState.ball;
    const paddle = gameState.player2.paddle;

    // ボールがAI側に向かっていない場合は中央に戻る
    if (ball.velocityX <= 0) {
      const canvasSize = this.gameManager?.getCanvasSize();
      const canvasHeight = canvasSize?.height || 400; // フォールバック値
      return {
        x: paddle.x,
        y: canvasHeight / 2, // 画面中央
        time: 0,
      };
    }

    let ballX = ball.x;
    let ballY = ball.y;
    let velocityX = ball.velocityX;
    let velocityY = ball.velocityY;
    let time = 0;

    const canvasSize = this.gameManager?.getCanvasSize();
    const canvasHeight = canvasSize?.height || 400; // フォールバック値
    const paddleX = paddle.x;

    // ボールがパドルのX位置に到達するまでシミュレート
    while (ballX < paddleX && time < 500) {
      // 時間制限を短縮
      ballX += velocityX;
      ballY += velocityY;
      time++;

      // 上下の壁での反射
      if (ballY <= ball.radius) {
        ballY = ball.radius;
        velocityY = Math.abs(velocityY);
      } else if (ballY >= canvasHeight - ball.radius) {
        ballY = canvasHeight - ball.radius;
        velocityY = -Math.abs(velocityY);
      }

      // 予測精度に基づくノイズ追加
      if (Math.random() > this.config.predictionAccuracy) {
        ballY += (Math.random() - 0.5) * 30;
      }
    }

    return {
      x: ballX,
      y: Math.max(ball.radius, Math.min(canvasHeight - ball.radius, ballY)),
      time,
    };
  }

  private executeMovement(): void {
    if (!this.gameManager) return;

    const currentState = this.gameManager.getGameState();
    if (!currentState || currentState.gameStatus !== "playing") return;

    const paddle = currentState.player2.paddle;
    const paddleCenter = paddle.y + paddle.height / 2;
    const difference = this.targetY - paddleCenter;
    const canvasSize = this.gameManager.getCanvasSize();
    const threshold = canvasSize ? canvasSize.height * 0.05 : 20; // キャンバス高さの5%、フォールバック20

    // 目標に近い場合は停止
    if (Math.abs(difference) < threshold) {
      this.stopMovement();
      return;
    }

    // 新しい方向を決定
    const newDirection = difference > 0 ? "down" : "up";

    // 方向が変わった場合、または動いていない場合は新しい移動を開始
    if (newDirection !== this.currentDirection || !this.isMoving) {
      this.startSmoothMovement(newDirection);
    }
  }

  private startSmoothMovement(direction: "up" | "down"): void {
    // 既存の移動を停止
    this.stopMovement();

    this.currentDirection = direction;
    this.isMoving = true;

    // 滑らかな移動のために短い間隔で連続移動
    this.moveTimer = window.setInterval(() => {
      if (!this.gameManager || !this.isActive) {
        this.stopMovement();
        return;
      }

      const currentState = this.gameManager.getGameState();
      if (!currentState || currentState.gameStatus !== "playing") {
        this.stopMovement();
        return;
      }

      const paddle = currentState.player2.paddle;
      const paddleCenter = paddle.y + paddle.height / 2;
      const difference = this.targetY - paddleCenter;

      // 目標に到達したか、方向が変わった場合は停止
      const canvasSize = this.gameManager.getCanvasSize();
      const threshold = canvasSize ? canvasSize.height * 0.05 : 20; // キャンバス高さの5%、フォールバック20

      if (
        Math.abs(difference) < threshold ||
        (direction === "up" && difference > 0) ||
        (direction === "down" && difference < 0)
      ) {
        this.stopMovement();
        return;
      }

      // 滑らかな移動速度
      const moveSpeed = paddle.speed * 0.8; // 少し遅めに
      const moveDistance = direction === "down" ? moveSpeed : -moveSpeed;

      try {
        this.gameManager.moveAiPaddle(moveDistance);
      } catch (error) {
        console.error("AI movement error:", error);
        this.stopMovement();
      }
    }, 16); // 約60FPSで滑らかに移動
  }

  cleanup(): void {
    this.stop();
    this.clearReactionTimer();
    this.stopMovement();
    this.gameManager = null;
  }
}
