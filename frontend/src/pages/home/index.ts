import { HomeService } from "./home.service";
import { SpacePageBase } from "../../shared/components/space-page-base";
import { i18next, onLanguageChange } from "../../i18n";

interface HomeTranslations {
  intro?: string;
  quickPlay?: string;
  quickPlayDescription?: string;
  tournament?: string;
  tournamentDescription?: string;
  gameSettings?: string;
  gameSettingsDescription?: string;
}

export class HomePage extends SpacePageBase {
  private service: HomeService;
  private t: HomeTranslations = {};
  private unsubscribeLanguageChange?: () => void;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new HomeService();

    this.loadTranslations();
    this.unsubscribeLanguageChange = onLanguageChange(
      this.handleLanguageChange.bind(this),
    );
  }

  render(): void {
    this.container.innerHTML = this.getTemplate();
    this.initializeAppHeader();
    this.attachEventListeners();
    this.initializeSpaceBackground();
  }

  private loadTranslations(): void {
    this.t =
      (i18next.t("home", {
        returnObjects: true,
      }) as HomeTranslations) || {};
  }

  private handleLanguageChange(): void {
    this.loadTranslations();
    this.render();
  }

  private getTemplate(): string {
    const intro = this.t.intro || "Select how you want to play Pong!";
    const quickPlay = this.t.quickPlay || "🎮 Quick Play";
    const quickPlayDescription =
      this.t.quickPlayDescription || "Play a 2 or 4 player match";
    const tournament = this.t.tournament || "🏆 Tournament";
    const tournamentDescription =
      this.t.tournamentDescription || "2, 4, or 8 player tournament";
    const gameSettings = this.t.gameSettings || "⚙️ Game Settings";
    const gameSettingsDescription =
      this.t.gameSettingsDescription || "Customize your game";

    const content = `
        <p class="text-center text-gray-300 mb-6">${intro}</p>
        
        <div class="space-y-4 max-w-sm mx-auto">
          <button id="quick-play-btn" class="w-full bg-purple-600 bg-opacity-30 hover:bg-opacity-50 text-white py-3 px-4 rounded border border-purple-500 shadow-lg transition-all duration-200">
            <div class="text-center">
              <div class="font-semibold text-lg">${quickPlay}</div>
              <div class="text-sm opacity-90">${quickPlayDescription}</div>
            </div>
          </button>
          
          <button id="tournament-play-btn" class="w-full bg-blue-600 bg-opacity-30 hover:bg-opacity-50 text-white py-3 px-4 rounded border border-blue-700 shadow-lg transition-all duration-200">
            <div class="text-center">
              <div class="font-semibold text-lg">${tournament}</div>
              <div class="text-sm opacity-90">${tournamentDescription}</div>
            </div>
          </button>
          
          <button id="game-settings-btn" class="w-full bg-blue-100 bg-opacity-30 hover:bg-opacity-50 text-white py-3 px-4 rounded border border-blue-100 shadow-lg transition-all duration-100">
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
    this.unsubscribeLanguageChange?.();
  }
}
