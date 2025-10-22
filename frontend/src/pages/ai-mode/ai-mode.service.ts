import { BaseAiGameService } from "../../shared/services/base-ai-game.service";
import { router } from "../../routes/router";
import { AiPlayer, type AiDifficulty } from "./ai-player";

export class AiModeService extends BaseAiGameService {
  initializeGame(canvasId: string): void {
    this.gameManager.initializeGame({
      mode: "ai-mode",
      canvasId,
      onGameEnd: (winner: number) => this.handleGameEnd(winner),
      onScoreUpdate: (score) => this.handleScoreUpdate(score),
    });

    this.aiPlayer = new AiPlayer(this.currentDifficulty);
  }
  attachGameControls(): void {
    this.addControlListener("start-ai-game", "click", () => this.startGame());
    this.addControlListener("pause-ai-game", "click", () => this.pauseGame());
    this.addControlListener("reset-ai-game", "click", () => this.resetGame());
    this.addControlListener("difficulty-select", "change", (e) => {
      const target = e.target as HTMLSelectElement;
      this.changeDifficulty(target.value as AiDifficulty);
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
