import { BaseGameService } from "./base-game.service";
import { AiPlayer, type AiDifficulty } from "../../pages/ai-mode/ai-player";

export abstract class BaseAiGameService extends BaseGameService {
  protected aiPlayer: AiPlayer | null = null;
  protected currentDifficulty: AiDifficulty = "medium";

  protected onGameStart(): void {
    console.log("BaseAiGameService: Starting AI player", this.aiPlayer);
    this.aiPlayer?.start(this.gameManager);
  }

  protected onGamePause(): void {
    this.aiPlayer?.pause();
  }

  protected onGameReset(): void {
    this.aiPlayer?.reset();
  }

  protected changeDifficulty(difficulty: AiDifficulty): void {
    this.currentDifficulty = difficulty;
    if (this.aiPlayer) {
      this.aiPlayer.setDifficulty(difficulty);
    }
    this.notificationService.info(`Difficulty changed to ${difficulty}`);
  }

  cleanup(): void {
    this.aiPlayer?.cleanup();
    super.cleanup();
  }
}
