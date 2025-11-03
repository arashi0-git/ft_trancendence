import { HomeService } from "./home.service";
import { SpacePageBase } from "../../shared/components/space-page-base";
import { translate } from "../../i18n";

export class HomePage extends SpacePageBase {
  private service: HomeService;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new HomeService();
  }

  render(): void {
    this.container.innerHTML = this.getTemplate();
    this.initializeAppHeader();
    this.attachEventListeners();
    this.initializeSpaceBackground();
  }

  private getTemplate(): string {
    const intro = translate("home.intro");
    const quickPlay = translate("home.quickPlay");
    const quickPlayDescription = translate("home.quickPlayDescription");
    const tournament = translate("home.tournament");
    const tournamentDescription = translate("home.tournamentDescription");
    const gameSettings = translate("home.gameSettings");
    const gameSettingsDescription = translate("home.gameSettingsDescription");

    const content = `
        <p class="text-center text-gray-300 mb-6">${intro}</p>
        
        <div class="space-y-4 mb-6">
          <button id="quick-play-btn" class="w-full bg-blue-400 hover:bg-blue-500 text-white py-3 px-4 rounded border border-blue-400 shadow-lg">
            <div class="text-center">
              <div class="font-semibold text-lg">${quickPlay}</div>
              <div class="text-sm opacity-90">${quickPlayDescription}</div>
            </div>
          </button>
          
          <button id="tournament-play-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded border border-blue-600 shadow-lg">
            <div class="text-center">
              <div class="font-semibold text-lg">${tournament}</div>
              <div class="text-sm opacity-90">${tournamentDescription}</div>
            </div>
          </button>
          

        </div>

        <button id="game-settings-btn" class="w-full bg-blue-200 hover:bg-blue-300 text-black py-3 px-4 rounded border border-blue-200 shadow-lg">
            <div class="text-center">
              <div class="font-semibold text-lg">${gameSettings}</div>
              <div class="text-sm opacity-90">${gameSettingsDescription}</div>
            </div>
          </button>
          </div>
    `;

    return this.getSpaceTemplate(content);
  }

  private attachEventListeners(): void {
    document
      .getElementById("quick-play-btn")
      ?.addEventListener("click", async () => {
        try {
          await this.playTransitionAndNavigate(
            () => this.service.navigateToQuickPlay(),
            "shootingStar",
            500,
          );
        } catch (error) {
          console.error("Quick Play navigation error:", error);
        }
      });

    document
      .getElementById("tournament-play-btn")
      ?.addEventListener("click", async () => {
        try {
          await this.playTransitionAndNavigate(
            () => this.service.navigateToTournament(),
            "spiralOut",
            600,
          );
        } catch (error) {
          console.error("Tournament navigation error:", error);
        }
      });

    document
      .getElementById("game-settings-btn")
      ?.addEventListener("click", async () => {
        try {
          await this.playTransitionAndNavigate(
            () => this.service.navigateToGameSettings(),
            "shootingStar",
            400,
          );
        } catch (error) {
          console.error("Game Settings navigation error:", error);
        }
      });
  }

  destroy(): void {
    this.cleanupSpaceBackground();
    this.cleanupAppHeader();
  }
}
