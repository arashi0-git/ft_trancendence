import { HistoryService } from "../../shared/services/history-service";
import type { GameHistory, GameHistoryStats } from "../../shared/types/history";
import { escapeHtml } from "../../shared/utils/html-utils";

type HistoryFilter = "all" | "quick" | "tournament";

export class HistorySection {
  private container: HTMLElement;
  private stats: GameHistoryStats | null = null;
  private history: GameHistory[] = [];
  private historyLoaded = false;
  private isLoading = false;
  private offset = 0;
  private hasMore = true;
  private readonly BATCH_SIZE = 10;
  private matchFilter: HistoryFilter = "all";

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
      const statsPromise = this.stats
        ? Promise.resolve(this.stats)
        : HistoryService.getMyStats();
      const historyPromise = HistoryService.getMyHistory({
        limit: this.BATCH_SIZE,
        offset: 0,
        matchType: this.matchFilter === "all" ? undefined : this.matchFilter,
      });

      const [stats, history] = await Promise.all([
        statsPromise,
        historyPromise,
      ]);

      this.stats = stats;
      this.history = history;
      this.offset = this.BATCH_SIZE;
      this.hasMore = history.length === this.BATCH_SIZE;
      this.historyLoaded = true;
    } catch (error) {
      console.error("Failed to load match history:", error);
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
        matchType: this.matchFilter === "all" ? undefined : this.matchFilter,
      });

      this.history = [...this.history, ...newHistory];
      this.offset += this.BATCH_SIZE;
      this.hasMore = newHistory.length === this.BATCH_SIZE;
    } catch (error) {
      console.error("Failed to load more history:", error);
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
      const emptyMessage =
        "No matches yet. Play some games to see your history here!";
      return `
        <div>
          ${this.renderFilterControls()}
          <div class="text-center p-6 bg-gray-900/40 rounded border border-cyan-500/20">
            <p class="text-sm text-gray-400">${emptyMessage}</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="space-y-2">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h4 class="text-sm font-semibold text-cyan-300">Recent Matches</h4>
          ${this.renderFilterControls()}
        </div>
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

    const [resultClass, resultText] = game.isWinner
      ? ["bg-green-600/30 text-green-400", "Win"]
      : ["bg-red-600/30 text-red-400", "Loss"];
    const resultBadge = `<span class="px-2 py-0.5 ${resultClass} text-[12px] rounded">${resultText}</span>`;

    const tournamentName = game.tournamentName?.trim() || "Tournament";
    const tournamentTitleAttr = escapeHtml(tournamentName);
    const truncatedTournamentLabel =
      tournamentName.length > 30
        ? `${escapeHtml(tournamentName.slice(0, 27))}...`
        : tournamentTitleAttr;
    const matchType = game.matchType;
    const isTournamentMatch =
      Boolean(game.tournamentId) || matchType === "tournament";
    const gameType = isTournamentMatch
      ? `<span class="text-[12px] text-purple-400 inline-flex items-center gap-1 max-w-[180px]" title="${tournamentTitleAttr}"><span aria-hidden="true">🏆</span><span class="truncate">${truncatedTournamentLabel}</span></span>`
      : `<span class="text-[12px] text-blue-400">⚡ Quick Match</span>`;

    const teamInfo = game.teammate
      ? ` · With: ${escapeHtml(game.teammate)}`
      : "";

    const [typeLabel, typeBadgeClass] =
      matchType === "tournament"
        ? [
            "Tournament",
            "bg-purple-600/20 text-purple-200 border border-purple-400/20",
          ]
        : [
            "Quick Match",
            "bg-cyan-600/20 text-cyan-100 border border-cyan-400/30",
          ];
    const roundBadge =
      matchType === "tournament" && game.tournamentRound
        ? `<span class="px-2 py-0.5 bg-purple-500/10 text-purple-200 text-[11px] rounded border border-purple-400/30">${escapeHtml(game.tournamentRound)}</span>`
        : "";

    return `
    <div class="p-2 bg-gray-900/40 rounded border border-cyan-500/20 hover:border-cyan-500/40 transition">
      <div class="flex justify-between items-center mb-1 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          ${gameType}
          <span class="text-[12px] text-gray-400">
            ${formattedDate} ${formattedTime}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 text-[11px] rounded ${typeBadgeClass}">
            ${typeLabel}
          </span>
          ${roundBadge}
          ${resultBadge}
        </div>
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

  private renderFilterControls(): string {
    const options: Array<{ value: HistoryFilter; label: string }> = [
      { value: "all", label: "All" },
      { value: "quick", label: "Quick" },
      { value: "tournament", label: "Tournament" },
    ];
    return `
      <div class="flex gap-2" role="tablist">
        ${options
          .map(({ value, label }) => this.renderFilterButton(value, label))
          .join("")}
      </div>
    `;
  }

  private renderFilterButton(filter: HistoryFilter, label: string): string {
    const isActive = this.matchFilter === filter;
    const classes = isActive
      ? "bg-cyan-600 text-white border border-cyan-400"
      : "bg-gray-900/70 text-gray-300 border border-cyan-500/30 hover:bg-gray-800";
    return `<button
        type="button"
        data-filter="${filter}"
        class="px-3 py-1 text-xs font-semibold rounded ${classes}"
        aria-pressed="${isActive}"
      >
        ${label}
      </button>`;
  }

  private attachListeners(): void {
    const loadMoreButton = this.container.querySelector(
      '[data-action="load-more"]',
    );
    if (loadMoreButton) {
      loadMoreButton.addEventListener("click", () => this.loadMoreHistory());
    }

    this.container
      .querySelectorAll<HTMLButtonElement>("[data-filter]")
      .forEach((button) => {
        const filter = button.dataset.filter as HistoryFilter | undefined;
        if (!filter) return;
        button.addEventListener("click", () => {
          void this.handleFilterClick(filter);
        });
      });
  }

  private async handleFilterClick(filter: HistoryFilter): Promise<void> {
    if (this.matchFilter === filter || this.isLoading) {
      return;
    }
    this.matchFilter = filter;
    this.history = [];
    this.offset = 0;
    this.hasMore = true;
    this.historyLoaded = false;
    this.renderLoading();
    await this.loadData();
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
