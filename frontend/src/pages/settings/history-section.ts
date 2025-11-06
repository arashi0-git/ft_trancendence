import { HistoryService } from "../../shared/services/history-service";
import { NotificationService } from "../../shared/services/notification.service";
import type { GameHistory, GameHistoryStats } from "../../shared/types/history";
import { escapeHtml } from "../../shared/utils/html-utils";

export class HistorySection {
  private container: HTMLElement;
  private stats: GameHistoryStats | null = null;
  private history: GameHistory[] = [];
  private historyLoaded = false;
  private isLoading = false;
  private offset = 0;
  private hasMore = true;
  private readonly BATCH_SIZE = 10;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render(): Promise<void> {
    // Prevent concurrent data loading
    if (this.isLoading) {
      return;
    }

    // If data is already loaded, just render it
    if (this.historyLoaded) {
      this.renderContent();
      return;
    }

    // Show loading state and load data
    this.renderLoading();
    await this.loadData();
  }

  private renderLoading(): void {
    this.container.innerHTML = `
      <section class="space-y-4 border-t border-gray-700 pt-4">
        <h3 class="text-lg font-semibold text-cyan-200">Match History & Stats</h3>
        <div id="stats-container">
          <p class="text-xs text-gray-400">Loading stats...</p>
        </div>
        <div id="history-container"></div>
      </section>
    `;
  }

  private renderContent(): void {
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
  }

  async loadData(): Promise<void> {
    // Prevent concurrent loading
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      // Load both stats and initial history in parallel
      const [stats, history] = await Promise.all([
        HistoryService.getMyStats(),
        HistoryService.getMyHistory({ limit: this.BATCH_SIZE, offset: 0 }),
      ]);

      this.stats = stats;
      this.history = history;
      this.offset = this.BATCH_SIZE;
      this.hasMore = history.length === this.BATCH_SIZE;
      this.historyLoaded = true;
    } catch (error) {
      console.error("Failed to load match history:", error);
      NotificationService.getInstance().error("Failed to load match history");
      this.container.innerHTML = `
        <section class="space-y-4 border-t border-gray-700 pt-4">
          <h3 class="text-lg font-semibold text-cyan-200">Match History & Stats</h3>
          <p class="text-sm text-red-400">Failed to load match history. Please try again later.</p>
        </section>
      `;
      return;
    } finally {
      this.isLoading = false;
    }

    this.renderContent();
  }

  async loadMoreHistory(): Promise<void> {
    if (this.isLoading || !this.hasMore) {
      return;
    }

    this.isLoading = true;

    // Update button to show loading state
    const historyContainer = this.container.querySelector("#history-container");
    if (historyContainer) {
      historyContainer.innerHTML = this.renderHistory();
      this.attachListeners();
    }

    try {
      const newHistory = await HistoryService.getMyHistory({
        limit: this.BATCH_SIZE,
        offset: this.offset,
      });

      this.history = [...this.history, ...newHistory];
      this.offset += this.BATCH_SIZE;
      this.hasMore = newHistory.length === this.BATCH_SIZE;
    } catch (error) {
      console.error("Failed to load more history:", error);
      NotificationService.getInstance().error("Failed to load more games");
    } finally {
      this.isLoading = false;

      // Re-render history section with updated state
      if (historyContainer) {
        historyContainer.innerHTML = this.renderHistory();
        this.attachListeners();
      }
    }
  }

  private renderStats(): string {
    if (!this.stats) {
      return `<p class="text-xs text-gray-400">No stats available</p>`;
    }

    return `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-900/40 rounded border border-cyan-500/20">
      <div class="text-center">
      <p class="text-2xl font-bold text-green-400">${this.stats.wins}</p>
      <p class="text-xs text-gray-400">Wins</p>
      </div>
      <div class="text-center">
      <p class="text-2xl font-bold text-red-400">${this.stats.losses}</p>
      <p class="text-xs text-gray-400">Losses</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-cyan-400">${this.stats.totalGames}</p>
        <p class="text-xs text-gray-400">Total Games</p>
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

    return `
      <div class="space-y-2">
        <h4 class="text-sm font-semibold text-cyan-300">Recent Matches</h4>
        <div class="space-y-2">
          ${this.history.map((game) => this.renderGameCard(game)).join("")}
        </div>
        ${
          this.hasMore
            ? `
          <button
            type="button"
            data-action="load-more"
            class="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-sm py-2 px-4 rounded transition ${this.isLoading ? "opacity-50 cursor-not-allowed" : ""}"
            ${this.isLoading ? "disabled" : ""}
          >
            ${this.isLoading ? "Loading..." : "Load More"}
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
      ? '<span class="px-2 py-0.5 bg-green-600/30 text-green-400 text-[12px] rounded">Win</span>'
      : '<span class="px-2 py-0.5 bg-red-600/30 text-red-400 text-[12px] rounded">Loss</span>';

    const gameType = game.tournamentId
      ? `<span class="text-[12px] text-purple-400">🏆 Tournament</span>`
      : `<span class="text-[12px] text-blue-400">⚡ Quick Match</span>`;

    const teamInfo = game.teammate
      ? ` · With: ${escapeHtml(game.teammate)}`
      : "";

    return `
    <div class="p-2 bg-gray-900/40 rounded border border-cyan-500/20 hover:border-cyan-500/40 transition">
      <div class="flex justify-between items-center mb-1">
        <div class="flex items-center gap-2">
          ${gameType}
          <span class="text-[12px] text-gray-400">
            ${formattedDate} ${formattedTime}
          </span>
        </div>
        ${resultBadge}
      </div>

      <div class="text-[13px] text-gray-100">
        <p>
          Score:
          <span class="font-semibold text-cyan-400">${game.myScore}</span>
          -
          <span class="font-semibold text-red-400">${game.opponentScore}</span>
          &nbsp;vs&nbsp;${escapeHtml(game.opponentInfo)}${teamInfo}
        </p>
      </div>
    </div>
  `;
  }

  private attachListeners(): void {
    const loadMoreButton = this.container.querySelector(
      '[data-action="load-more"]',
    );
    if (loadMoreButton) {
      loadMoreButton.addEventListener("click", () => this.loadMoreHistory());
    }
  }

  destroy(): void {
    // Clear container content (removes event listeners attached to child elements)
    this.container.innerHTML = "";
    this.stats = null;
    this.history = [];
    this.historyLoaded = false;
    this.isLoading = false;
    this.offset = 0;
    this.hasMore = true;
  }
}
