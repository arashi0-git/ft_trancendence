import { BaseAiGameService } from "../../shared/services/base-ai-game.service";
import { router } from "../../routes/router";
import { AiPlayer, type AiDifficulty } from "./ai-player";

export class AiModeService extends BaseAiGameService {
  initializeGame(canvasId: string): void {
    try {
      this.gameManager.initializeGame({
        mode: "ai-mode",
        canvasId,
        onGameEnd: (winner: number) => this.handleGameEnd(winner),
        onScoreUpdate: (score) => this.handleScoreUpdate(score),
      });

      if (this.aiPlayer) {
        this.aiPlayer.stop();
      }
      this.aiPlayer = new AiPlayer(this.currentDifficulty);
    } catch (error) {
      this.notificationService.error("AI-modeの初期化に失敗しました");
      console.error("Failed to initialize AI mode:", error);
      throw error;
    }
  }
  attachGameControls(): void {
    this.addControlListener("start-ai-game", "click", () => this.startGame());
    this.addControlListener("pause-ai-game", "click", () => this.pauseGame());
    this.addControlListener("reset-ai-game", "click", () => this.resetGame());
    this.addControlListener("difficulty-select", "change", (e) => {
      const target = e.target as HTMLSelectElement;
      const value = target.value;
      if (value === "easy" || value === "medium" || value === "hard") {
        this.changeDifficulty(value as AiDifficulty);
      }
    });
  }

  attachNavigationControls(): void {
    this.addControlListener("back-to-home", "click", () =>
      this.navigateToHome(),
    );
  }

  protected getStartButton(): HTMLButtonElement | null {
    return document.getElementById("start-ai-game") as HTMLButtonElement;
  }

  protected getPauseButton(): HTMLButtonElement | null {
    return document.getElementById("pause-ai-game") as HTMLButtonElement;
  }

  private handleGameEnd(winner: number): void {
    this.aiPlayer?.stop();

    const message =
      winner === 1 ? "🎉 You won against the AI!" : "🤖 AI wins this round!";

    this.notificationService.success(message);
    this.updateButtonStates(false);
  }

  private handleScoreUpdate(score: { player1: number; player2: number }): void {
    console.log(`Score: Player ${score.player1} - ${score.player2} AI`);
  }

  navigateToHome(): void {
    this.cleanup();
    router.navigate("/");
  }
}
