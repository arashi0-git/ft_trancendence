import { BaseGameService } from "./base-game.service";
import { AiPlayer, type AiDifficulty } from "../../pages/ai-mode/ai-player";

export abstract class BaseAiGameService extends BaseGameService {
  protected aiPlayer: AiPlayer | null = null;
  protected currentDifficulty: AiDifficulty = "medium";

  protected onGameStart(): void {
    try {
      if (!this.aiPlayer) {
        throw new Error("AI player not initialized");
      }
      console.log("BaseAiGameService: Starting AI player", this.aiPlayer);
      this.aiPlayer.start(this.gameManager);
    } catch (error) {
      console.error("Failed to start AI player:", error);
      throw error; // Re-throw to be handled by BaseGameService
    }
  }

  protected onGamePause(): void {
    this.aiPlayer?.pause();
  }

  protected onGameReset(): void {
    this.aiPlayer?.reset();
  }

  cleanup(): void {
    this.aiPlayer?.cleanup();
    super.cleanup();
  }
}
