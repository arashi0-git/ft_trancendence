import { TournamentService } from "./tournament.service";
import { SpacePageBase } from "../../shared/components/space-page-base";

export class TournamentPage extends SpacePageBase {
  private service: TournamentService;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new TournamentService();
  }

  render(): void {
    // URLパスに基づいて適切な画面を表示
    const currentPath = window.location.pathname;
    this.service.setCurrentPath(currentPath);

    this.container.innerHTML = this.getTemplate();
    this.service.initializeCurrentView();
    this.initializeSpaceBackground();
  }

  private getTemplate(): string {
    const title = this.service.getPageTitle();

    const content = `
        <div class="text-center mb-4">
          <h2 class="text-2xl font-bold text-white inline-block">${title}</h2>
        </div>
        <div id="tournament-content"></div>
        <div id="game-over-modal" ...> ... </div>
    `;

    return this.getSpaceTemplate(content);
  }

  destroy(): void {
    this.service.cleanup();
    this.cleanupSpaceBackground();
  }
}
