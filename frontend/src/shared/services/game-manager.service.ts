import { PongGame } from "../game/pong-game";

export type GameMode = "quick-play" | "tournament" | "ai-mode";

export interface GameConfig {
  mode: GameMode;
  canvasId: string;
  onGameEnd?: (winner: number) => void;
  onScoreUpdate?: (score: { player1: number; player2: number }) => void;
}

export class GameManagerService {
  private pongGame: PongGame | null = null;
  private currentConfig: GameConfig | null = null;

  initializeGame(config: GameConfig): void {
    this.cleanup();

    const canvas = document.getElementById(
      config.canvasId,
    ) as HTMLCanvasElement;
    if (!canvas) {
      console.error(`Canvas with id '${config.canvasId}' not found`);
      return;
    }

    this.currentConfig = config;
    this.pongGame = new PongGame(canvas);

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
  }

  startGame(): void {
    this.pongGame?.startGame();
  }

  pauseGame(): void {
    this.pongGame?.pauseGame();
  }

  resetGame(): void {
    this.pongGame?.resetGame();
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
    this.pongGame?.moveAiPaddle(deltaY);
  }
}
