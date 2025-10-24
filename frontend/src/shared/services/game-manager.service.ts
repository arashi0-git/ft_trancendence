import { PongGame3D } from "../game/pong-game-3d";

export type GameMode = "quick-play" | "tournament" | "ai-mode";

export interface GameConfig {
  mode: GameMode;
  canvasId: string;
  onGameEnd?: (winner: number) => void;
  onScoreUpdate?: (score: { player1: number; player2: number }) => void;
}

export class GameManagerService {
  private pongGame: PongGame3D | null = null;
  private currentConfig: GameConfig | null = null;

  initializeGame(config: GameConfig): void {
    try {
      this.cleanup();

      const canvas = document.getElementById(config.canvasId);

      if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas with id '${config.canvasId}' not found`);
      }

      this.currentConfig = config;
      this.pongGame = new PongGame3D(canvas);

      // AIモードの設定
      if (config.mode === "ai-mode") {
        this.pongGame.setAiMode(true);
      }

      // イベントハンドラーの設定
      if (config.onGameEnd) {
        this.pongGame.on("onGameEnd", config.onGameEnd);
      }

      if (config.onScoreUpdate) {
        this.pongGame.on("onScoreUpdate", config.onScoreUpdate);
      }

      this.pongGame.resetGame();
    } catch (error) {
      console.error("Failed to initialize game:", error);
      throw error;
    }
  }

  startGame(): void {
    if (!this.pongGame) {
      throw new Error("Game not initialized");
    }
    this.pongGame.startGame();
  }

  pauseGame(): void {
    if (!this.pongGame) {
      throw new Error("Game not initialized");
    }
    this.pongGame.pauseGame();
  }

  resetGame(): void {
    if (!this.pongGame) {
      throw new Error("Game not initialized");
    }
    this.pongGame.resetGame();
  }

  getGameState() {
    return this.pongGame?.getGameState();
  }

  cleanup(): void {
    if (this.pongGame) {
      this.pongGame.destroy();
      this.pongGame = null;
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

  moveAiPaddle(deltaY: number): void {
    if (!this.pongGame) {
      throw new Error("Game not initialized");
    }
    this.pongGame.moveAiPaddle(deltaY);
  }

  getCanvasSize(): { width: number; height: number } | null {
    return this.pongGame?.getCanvasSize() || null;
  }
}
