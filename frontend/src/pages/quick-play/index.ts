import { QuickPlayService } from "./quick-play.service";
import { SpacePageBase } from "../../shared/components/space-page-base";
import { PlayerRegistrationWithCountSelector } from "../../shared/components/player-registration-with-count-selector";
import { translate } from "../../i18n";
import type { PlayerOption } from "../../shared/types/tournament";

type QuickPlayStep = "registration" | "game";

export class QuickPlayPage extends SpacePageBase {
  private service: QuickPlayService;
  private playerRegistrationWithCountSelector: PlayerRegistrationWithCountSelector;
  private currentStep: QuickPlayStep = "registration";
  private selectedPlayerCount: number = 2;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new QuickPlayService();
    this.playerRegistrationWithCountSelector =
      new PlayerRegistrationWithCountSelector();
  }

  async render(): Promise<void> {
    this.ensureBaseTemplate();
    await this.renderPlayerRegistrationView();
    this.initializeSpaceBackground();
  }

  private renderGameView(
    playerCount: number,
    aiPlayers?: { [key: string]: { difficulty: "easy" | "medium" | "hard" } },
  ): void {
    const contentDiv = this.ensureBaseTemplate();
    if (!contentDiv) {
      console.warn(
        "QuickPlayPage: failed to ensure base template for game view",
      );
      return;
    }

    this.playerRegistrationWithCountSelector.destroy();
    this.selectedPlayerCount = playerCount;
    this.currentStep = "game";
    this.updateHeader();

    const startGameLabel = translate("quickPlay.startGame");
    const pauseGameLabel = translate("quickPlay.pauseGame");
    const resetGameLabel = translate("quickPlay.resetGame");
    const gameFinishedLabel = translate("quickPlay.gameFinished");
    const winnerLabel = translate("quickPlay.winner");
    const finalScoreLabel = translate("quickPlay.finalScore");
    const resetGameButtonLabel = translate("quickPlay.resetGameButton");

    const gameContent = `
      <div class="space-y-4">
        <div class="text-center">
          <div class="space-x-3">
            <button id="start-game" class="bg-green-600 hover:bg-green-700 text-white px-4 py-1 text-sm rounded border border-green-400 shadow-lg">${startGameLabel}</button>
            <button id="pause-game" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-1 text-sm rounded border border-yellow-400 shadow-lg" disabled>${pauseGameLabel}</button>
            <button id="reset-game" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 text-sm rounded border border-blue-400 shadow-lg">${resetGameLabel}</button>
          </div>
        </div>
        
        <div class="flex justify-center">
          <canvas id="pong-canvas" class="border-2 border-gray-300 bg-black max-w-full h-auto"></canvas>
        </div>
        
        <div class="text-center text-sm text-gray-300">
          ${this.getControlsTemplate(playerCount)}
        </div>

        <div id="game-over-modal" class="hidden absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-75 z-50">
          <div class="bg-white p-8 rounded-lg shadow-xl text-center text-black">
            <h2 class="text-3xl font-bold mb-4">${gameFinishedLabel}</h2>
            <p class="text-xl mb-2">${winnerLabel}: <span id="winner-name" class="font-semibold"></span></p>
            <p class="text-lg mb-6">${finalScoreLabel}: <span id="final-score" class="font-semibold"></span></p>
            <button id="reset-game-modal-btn" class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded">
              ${resetGameButtonLabel}
            </button>
          </div>  
        </div>
      </div>
    `;
    contentDiv.innerHTML = gameContent;
    this.attachGameEventListeners();
    this.service.initializeGame("pong-canvas", playerCount, aiPlayers);
  }

  private async renderPlayerRegistrationView(): Promise<void> {
    const contentDiv = this.ensureBaseTemplate();
    if (!contentDiv) {
      console.warn(
        "QuickPlayPage: failed to locate #quick-play-content container",
      );
      return;
    }

    this.currentStep = "registration";
    this.updateHeader();

    const registrationTitle = translate("quickPlay.registrationTitle");
    const registrationSubtitle = translate("quickPlay.registrationSubtitle", {
      count: this.selectedPlayerCount,
    });
    const startButtonText = translate("quickPlay.startGameButton");
    const backButtonText = translate("quickPlay.homeButton");
    const registrationErrorMessage = translate("quickPlay.registrationError");

    try {
      await this.playerRegistrationWithCountSelector.render({
        container: contentDiv,
        title: registrationTitle,
        subtitle: registrationSubtitle,
        showTournamentName: false,
        startButtonText,
        backButtonText,
        requireHumanPlayer: false,
        onBack: () => {
          this.service.navigateToHome();
        },
        onSubmit: (data) => {
          this.selectedPlayerCount = data.playerCount;
          this.startQuickPlayGame(data.playerSelections);
        },
      });
    } catch (error) {
      console.error("Failed to render registration view:", error);
      alert(registrationErrorMessage);
    }
  }

  private getTemplate(): string {
    const pageTitle = translate("quickPlay.pageTitleRegistration");
    const homeButtonLabel = translate("quickPlay.homeButton");
    const content = `
      <div class="flex justify-between items-center mb-4">
        <h2 id="quick-play-page-title" class="text-2xl font-bold text-white">${pageTitle}</h2>
        <div id="quick-play-header-actions" class="space-x-2">
          <button id="quick-play-home-button" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded border border-purple-400">${homeButtonLabel}</button>
        </div>
      </div>
      <div id="quick-play-content"></div>
    `;
    return this.getSpaceTemplate(content);
  }

  private getControlsTemplate(playerCount: number): string {
    const p1Controls = `<p class="text-white">${translate("quickPlay.controls.playerLeftOuter", { keys: "W/S" })}</p>`;
    const p2Controls = `<p class="text-white">${translate("quickPlay.controls.playerRightOuter", { keys: "↑/↓" })}</p>`;
    if (playerCount === 4) {
      const p3Controls = `<p class="text-white">${translate("quickPlay.controls.playerLeftInner", { keys: "R/F" })}</p>`;
      const p4Controls = `<p class="text-white">${translate("quickPlay.controls.playerRightInner", { keys: "I/K" })}</p>`;
      return `${p1Controls}${p2Controls}${p3Controls}${p4Controls}`;
    }
    return `${p1Controls}${p2Controls}`;
  }

  private startQuickPlayGame(playerSelections: (PlayerOption | null)[]): void {
    // AIプレイヤー設定を構築
    const aiPlayers: {
      [key: string]: { difficulty: "easy" | "medium" | "hard" };
    } = {};

    playerSelections.forEach((selection, index) => {
      if (selection?.isAI && selection.aiDifficulty) {
        const playerKey = `player${index + 1}`;
        aiPlayers[playerKey] = { difficulty: selection.aiDifficulty };
      }
    });

    this.renderGameView(this.selectedPlayerCount, aiPlayers);
  }

  private attachGameEventListeners(): void {
    this.service.attachGameControls();
  }

  private updateHeader(): void {
    const titleElement = this.container.querySelector(
      "#quick-play-page-title",
    ) as HTMLElement | null;
    const actionsContainer = this.container.querySelector(
      "#quick-play-header-actions",
    ) as HTMLElement | null;

    if (!titleElement || !actionsContainer) {
      return;
    }

    const registrationTitle = translate("quickPlay.pageTitleRegistration");
    const gameTitle = translate("quickPlay.pageTitleGame");
    const homeButtonLabel = translate("quickPlay.homeButton");
    const backToRegistrationLabel = translate("quickPlay.backToRegistration");

    let title = registrationTitle;
    let actionsHtml = `
      <button id="quick-play-home-button" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded border border-purple-400">
        ${homeButtonLabel}
      </button>
    `;

    if (this.currentStep === "game") {
      title = gameTitle;
      actionsHtml = `
        <button id="quick-play-header-back" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded border border-purple-400">
          ${backToRegistrationLabel}
        </button>
      `;
    }

    titleElement.textContent = title;
    actionsContainer.innerHTML = actionsHtml;

    if (this.currentStep === "registration") {
      document
        .getElementById("quick-play-home-button")
        ?.addEventListener("click", () => {
          this.service.navigateToHome();
        });
    } else {
      document
        .getElementById("quick-play-header-back")
        ?.addEventListener("click", async () => {
          this.service.cleanup();
          await this.renderPlayerRegistrationView();
        });
    }
  }

  private ensureBaseTemplate(): HTMLElement | null {
    let contentDiv = this.container.querySelector(
      "#quick-play-content",
    ) as HTMLElement | null;

    if (!contentDiv) {
      this.container.innerHTML = this.getTemplate();
      this.initializeAppHeader();
      contentDiv = this.container.querySelector(
        "#quick-play-content",
      ) as HTMLElement | null;
    }

    return contentDiv;
  }

  destroy(): void {
    this.service.cleanup();
    this.playerRegistrationWithCountSelector.destroy();
    this.cleanupSpaceBackground();
    this.cleanupAppHeader();
  }
}
