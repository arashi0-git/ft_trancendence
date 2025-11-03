import { HistoryService } from "../../shared/services/history-service";
import { NotificationService } from "../../shared/services/notification.service";
import type { GameHistory, GameHistoryStats } from "../../shared/types/history";

export class HistorySection {
  private container: HTMLElement;
  private stats: GameHistoryStats | null = null;
  private history: GameHistory[] = [];
  private historyLoaded = false;
  private showAll = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render(): Promise<void> {
    this.container.innerHTML = `
      <section class="space-y-4 border-t border-gray-700 pt-4">
        <h3 class="text-lg font-semibold text-cyan-200">Match History & Stats</h3>
        <div id="stats-container">
          ${this.historyLoaded ? this.renderStats() : this.renderLoading()}
        </div>
        <div id="history-container">
          ${this.historyLoaded ? this.renderHistory() : ""}
        </div>
      </section>
    `;

    if (!this.historyLoaded) {
      await this.loadData();
    }
  }

  async loadData(): Promise<void> {
    try {
      // Load both stats and history in parallel
      const [stats, history] = await Promise.all([
        HistoryService.getMyStats(),
        HistoryService.getMyHistory({ limit: 10 }),
      ]);

      this.stats = stats;
      this.history = history;
      this.historyLoaded = true;

      // Re-render with loaded data
      this.container.innerHTML = `
        <section class="space-y-4 border-t border-gray-700 pt-4">
          <h3 class="text-lg font-semibold text-cyan-200">Match History & Stats</h3>
          <div id="stats-container">
            ${this.renderStats()}
          </div>
          <div id="history-container">
            ${this.renderHistory()}
          </div>
        </section>
      `;

      this.attachListeners();
    } catch (error) {
      console.error("Failed to load match history:", error);
      NotificationService.getInstance().error("Failed to load match history");
      this.container.innerHTML = `
        <section class="space-y-4 border-t border-gray-700 pt-4">
          <h3 class="text-lg font-semibold text-cyan-200">Match History & Stats</h3>
          <p class="text-sm text-red-400">Failed to load match history. Please try again later.</p>
        </section>
      `;
    }
  }

  private renderLoading(): string {
    return `<p class="text-xs text-gray-400">Loading stats...</p>`;
  }

  private renderStats(): string {
    if (!this.stats) {
      return `<p class="text-xs text-gray-400">No stats available</p>`;
    }

    return `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-900/40 rounded border border-cyan-500/20">
        <div class="text-center">
          <p class="text-2xl font-bold text-cyan-400">${this.stats.totalGames}</p>
          <p class="text-xs text-gray-400">Total Games</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-green-400">${this.stats.wins}</p>
          <p class="text-xs text-gray-400">Wins</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-red-400">${this.stats.losses}</p>
          <p class="text-xs text-gray-400">Losses</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-purple-400">${this.stats.winRate.toFixed(1)}%</p>
          <p class="text-xs text-gray-400">Win Rate</p>
        </div>
      </div>
    `;
  }

  private renderHistory(): string {
    if (this.history.length === 0) {
      return `
        <div class="text-center p-6 bg-gray-900/40 rounded border border-cyan-500/20">
          <p class="text-sm text-gray-400">No match history yet. Play some games to see your history here!</p>
        </div>
      `;
    }

    const displayHistory = this.showAll
      ? this.history
      : this.history.slice(0, 5);

    return `
      <div class="space-y-2">
        <h4 class="text-sm font-semibold text-cyan-300">Recent Matches</h4>
        <div class="space-y-2">
          ${displayHistory.map((game) => this.renderGameCard(game)).join("")}
        </div>
        ${
          this.history.length > 5
            ? `
          <button
            type="button"
            data-action="toggle-history"
            class="w-full text-sm text-cyan-400 hover:text-cyan-300 py-2 transition"
          >
            ${this.showAll ? "Show Less" : `Show All (${this.history.length})`}
          </button>
        `
            : ""
        }
      </div>
    `;
  }

  private renderGameCard(game: GameHistory): string {
    const date = new Date(game.finishedAt);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const resultBadge = game.isWinner
      ? '<span class="px-2 py-1 bg-green-600/30 text-green-400 text-xs rounded">Win</span>'
      : '<span class="px-2 py-1 bg-red-600/30 text-red-400 text-xs rounded">Loss</span>';

    const gameType = game.tournamentId
      ? `<span class="text-xs text-purple-400">🏆 Tournament</span>`
      : `<span class="text-xs text-blue-400">⚡ Quick Match</span>`;

    const teamInfo = game.teammate
      ? `<p class="text-xs text-gray-400">With: ${game.teammate}</p>`
      : "";

    return `
      <div class="p-3 bg-gray-900/40 rounded border border-cyan-500/20 hover:border-cyan-500/40 transition">
        <div class="flex justify-between items-start mb-2">
          <div>
            ${gameType}
            <p class="text-xs text-gray-500 mt-1">${formattedDate} ${formattedTime}</p>
          </div>
          ${resultBadge}
        </div>
        <div class="text-sm text-white">
          <p>Score: <span class="font-semibold text-cyan-400">${game.myScore}</span> - <span class="font-semibold text-red-400">${game.opponentScore}</span></p>
          <p class="text-xs text-gray-400">vs ${game.opponentInfo}</p>
          ${teamInfo}
        </div>
      </div>
    `;
  }

  private attachListeners(): void {
    const toggleButton = this.container.querySelector(
      '[data-action="toggle-history"]',
    );
    if (toggleButton) {
      toggleButton.addEventListener("click", () => this.handleToggle());
    }
  }

  private handleToggle(): void {
    this.showAll = !this.showAll;
    const historyContainer = this.container.querySelector("#history-container");
    if (historyContainer) {
      historyContainer.innerHTML = this.renderHistory();
      this.attachListeners();
    }
  }

  destroy(): void {
    // Cleanup if needed
  }
}
