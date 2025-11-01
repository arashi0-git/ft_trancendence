import { PongGame3D } from "../game/pong-game-3d";
import { AiPlayer } from "../../pages/ai-mode/ai-player";
import { gameCustomizationService } from "./game-customization.service";
import type { GameCustomizationSettings } from "./game-customization.service";
export type GameMode = "quick-play" | "tournament" | "ai-mode";

export interface GameConfig {
  mode: GameMode;
  canvasId: string;
  playerCount?: number;
  aiPlayers?: {
    player1?: { difficulty: "easy" | "medium" | "hard" };
    player2?: { difficulty: "easy" | "medium" | "hard" };
  };
  onGameEnd?: (data: {
    winner: number;
    score1: number;
    score2: number;
  }) => void;
  onScoreUpdate?: (score: { player1: number; player2: number }) => void;
}

export class GameManagerService {
  private pongGame: PongGame3D | null = null;
  private currentConfig: GameConfig | null = null;
  private customizationUnsubscribe: (() => void) | null = null;
  private aiPlayer1: AiPlayer | null = null;
  private aiPlayer2: AiPlayer | null = null;

  initializeGame(config: GameConfig): void {
    try {
      this.cleanup();

      const canvas = document.getElementById(config.canvasId);

      if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas with id '${config.canvasId}' not found`);
      }

      this.currentConfig = config;
      const customizationSettings = gameCustomizationService.getSettings();
      // Make sure to pass config.playerCount here, not {}
      this.pongGame = new PongGame3D(canvas, config.playerCount, {
        fieldColorHex: customizationSettings.fieldColor,
        ballColorHex: customizationSettings.ballColor,
        paddleColorHex: customizationSettings.paddleColor,
        paddleLength: customizationSettings.paddleLength,
        ballSize: customizationSettings.ballSize,
        ballSpeed: customizationSettings.ballSpeed,
        maxScore: customizationSettings.maxScore,
      }); // Pass the playerCount

      // AIモードの設定
      if (config.mode === "ai-mode") {
        this.pongGame.setAiMode(true);
      }

      // AIプレイヤーの設定
      if (config.aiPlayers) {
        if (config.aiPlayers.player1) {
          this.aiPlayer1 = new AiPlayer(config.aiPlayers.player1.difficulty, 1);
          console.log(
            `Created AI Player 1 with difficulty: ${config.aiPlayers.player1.difficulty}`,
          );
        }
        if (config.aiPlayers.player2) {
          this.aiPlayer2 = new AiPlayer(config.aiPlayers.player2.difficulty, 2);
          console.log(
            `Created AI Player 2 with difficulty: ${config.aiPlayers.player2.difficulty}`,
          );
        }
        // AIプレイヤーがいる場合はAIモードを有効にする
        this.pongGame.setAiMode(true);
        // AIプレイヤー情報を設定
        this.pongGame.setAiPlayers({
          player1: !!config.aiPlayers.player1,
          player2: !!config.aiPlayers.player2,
        });
      }

      // イベントハンドラーの設定
      if (config.onGameEnd) {
        this.pongGame.on(
          "onGameEnd",
          config.onGameEnd as (data: {
            winner: number;
            score1: number;
            score2: number;
          }) => void,
        );
      }

      if (config.onScoreUpdate) {
        this.pongGame.on(
          "onScoreUpdate",
          config.onScoreUpdate as (score: {
            player1: number;
            player2: number;
          }) => void,
        );
      }

      this.pongGame.resetGame();

      this.customizationUnsubscribe = gameCustomizationService.subscribe(
        (settings: GameCustomizationSettings) => {
          if (this.pongGame) {
            this.pongGame.setFieldColor(settings.fieldColor);
            this.pongGame.setBallColor(settings.ballColor);
            this.pongGame.setPaddleColor(settings.paddleColor);
            this.pongGame.setPaddleLength(settings.paddleLength);
            this.pongGame.setBallSize(settings.ballSize);
            this.pongGame.setBallSpeed(settings.ballSpeed);
            this.pongGame.setMaxScore(settings.maxScore);
          }
        },
      );
    } catch (error) {
      console.error("Failed to initialize game:", error);
      throw error;
    }
  }
  // ... rest of the class

  startGame(): void {
    if (!this.pongGame) {
      throw new Error("Game not initialized");
    }
    this.pongGame.startGame();

    // AIプレイヤーを開始
    if (this.aiPlayer1) {
      this.aiPlayer1.start(this);
    }
    if (this.aiPlayer2) {
      this.aiPlayer2.start(this);
    }
  }

  pauseGame(): void {
    if (!this.pongGame) {
      throw new Error("Game not initialized");
    }
    this.pongGame.pauseGame();

    // AIプレイヤーを一時停止
    if (this.aiPlayer1) {
      this.aiPlayer1.pause();
    }
    if (this.aiPlayer2) {
      this.aiPlayer2.pause();
    }
  }

  resetGame(): void {
    if (!this.pongGame) {
      throw new Error("Game not initialized");
    }
    this.pongGame.resetGame();

    // AIプレイヤーをリセット
    if (this.aiPlayer1) {
      this.aiPlayer1.reset();
    }
    if (this.aiPlayer2) {
      this.aiPlayer2.reset();
    }
  }

  getGameState() {
    return this.pongGame?.getGameState();
  }

  cleanup(): void {
    if (this.aiPlayer1) {
      this.aiPlayer1.cleanup();
      this.aiPlayer1 = null;
    }
    if (this.aiPlayer2) {
      this.aiPlayer2.cleanup();
      this.aiPlayer2 = null;
    }
    if (this.pongGame) {
      this.pongGame.destroy();
      this.pongGame = null;
    }
    if (this.customizationUnsubscribe) {
      this.customizationUnsubscribe();
      this.customizationUnsubscribe = null;
    }
    this.currentConfig = null;
  }

  // エイリアス（後方互換性のため）
  destroy(): void {
    this.cleanup();
  }

  isGameActive(): boolean {
    return this.pongGame !== null;
  }

  getCurrentMode(): GameMode | null {
    return this.currentConfig?.mode || null;
  }

  moveAiPaddle(deltaY: number, playerNumber: 1 | 2 = 2): void {
    if (!this.pongGame) {
      throw new Error("Game not initialized");
    }
    this.pongGame.moveAiPaddle(deltaY, playerNumber);
  }

  getCanvasSize(): { width: number; height: number } | null {
    return this.pongGame?.getCanvasSize() || null;
  }
}
