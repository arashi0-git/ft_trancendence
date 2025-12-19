import { HistoryService } from "../../shared/services/history-service";
import type { GameHistory, GameHistoryStats } from "../../shared/types/history";
import { escapeHtml } from "../../shared/utils/html-utils";
import { i18next, onLanguageChange } from "../../i18n";

type TournamentRoundKey = "final" | "semiFinal" | "quarterFinal";

const ROUND_LABELS: Record<TournamentRoundKey, string[]> = {
  final: ["Final", "Finále", "決勝"],
  semiFinal: ["Semi-Final", "Semifinále", "準決勝"],
  quarterFinal: ["Quarter-Final", "Čtvrtfinále", "準々決勝"],
};

const ROUND_LABEL_LOOKUP = new Map<string, TournamentRoundKey>();
(Object.entries(ROUND_LABELS) as Array<[TournamentRoundKey, string[]]>).forEach(
  ([key, labels]) => {
    labels.forEach((label) => {
      const normalized = label.trim().toLowerCase();
      ROUND_LABEL_LOOKUP.set(normalized, key);
    });
  },
);

const AI_DIFFICULTY_VALUES: Record<"easy" | "medium" | "hard", string[]> = {
  easy: ["Easy", "Snadná", "やさしい"],
  medium: ["Medium", "Střední", "ふつう"],
  hard: ["Hard", "Těžká", "難しい"],
};

const normalizeDifficultyToken = (value: string): string =>
  value.replace(/\s+/g, "").toLowerCase();

const AI_DIFFICULTY_LOOKUP = new Map<string, "easy" | "medium" | "hard">();
(
  Object.entries(AI_DIFFICULTY_VALUES) as Array<
    ["easy" | "medium" | "hard", string[]]
  >
).forEach(([key, labels]) => {
  labels.forEach((label) => {
    AI_DIFFICULTY_LOOKUP.set(normalizeDifficultyToken(label), key);
  });
});

const AI_NAME_REGEX = /^AI\s*(\d+)?\s*\((.+)\)$/i;

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
  private unsubscribeLanguage?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.unsubscribeLanguage = onLanguageChange(() => {
      if (this.historyLoaded) {
        this.renderContent();
      } else if (this.isLoading) {
        this.renderLoading();
      } else {
        this.renderLoading();
      }
    });
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
        <h3 class="text-lg font-semibold text-cyan-200">
          ${i18next.t("settings.history.title", "Match History & Stats")}
        </h3>
        <div id="stats-container">
          <p class="text-xs text-gray-400">
            ${i18next.t("settings.history.loadingStats", "Loading stats...")}
          </p>
        </div>
        <div id="history-container"></div>
      </section>
    `;
  }

  private renderContent(): void {
    this.container.innerHTML = `
      <section class="space-y-4 border-t border-gray-700 pt-4">
        <h3 class="text-lg font-semibold text-cyan-200">
          ${i18next.t("settings.history.title", "Match History & Stats")}
        </h3>
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
          <h3 class="text-lg font-semibold text-cyan-200">
            ${i18next.t("settings.history.title", "Match History & Stats")}
          </h3>
          <p class="text-sm text-red-400">
            ${i18next.t(
              "settings.history.loadError",
              "Failed to load match history. Please try again later.",
            )}
          </p>
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
      return `<p class="text-xs text-gray-400">${i18next.t(
        "settings.history.noStats",
        "No stats available",
      )}</p>`;
    }

    return `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-900/40 rounded border border-cyan-500/20">
      <div class="text-center">
      <p class="text-2xl font-bold text-green-400">${this.stats.wins}</p>
      <p class="text-xs text-gray-400">${i18next.t("settings.history.wins", "Wins")}</p>
      </div>
      <div class="text-center">
      <p class="text-2xl font-bold text-red-400">${this.stats.losses}</p>
      <p class="text-xs text-gray-400">${i18next.t("settings.history.losses", "Losses")}</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-cyan-400">${this.stats.totalGames}</p>
        <p class="text-xs text-gray-400">${i18next.t(
          "settings.history.totalGames",
          "Total Games",
        )}</p>
      </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-purple-400">${this.stats.winRate.toFixed(1)}%</p>
          <p class="text-xs text-gray-400">${i18next.t(
            "settings.history.winRate",
            "Win Rate",
          )}</p>
        </div>
      </div>
    `;
  }

  private renderHistory(): string {
    if (this.history.length === 0) {
      const emptyMessage = i18next.t(
        "settings.history.empty",
        "No matches yet. Play some games to see your history here!",
      );
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
          <h4 class="text-sm font-semibold text-cyan-300">
            ${i18next.t("settings.history.recentMatches", "Recent Matches")}
          </h4>
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
            ${
              this.isLoading
                ? i18next.t("settings.history.loading", "Loading...")
                : i18next.t("settings.history.loadMore", "Load More")
            }
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
      ? [
          "bg-green-600/30 text-green-400",
          i18next.t("settings.history.results.win", "Win"),
        ]
      : [
          "bg-red-600/30 text-red-400",
          i18next.t("settings.history.results.loss", "Loss"),
        ];
    const resultBadge = `<span class="px-2 py-0.5 ${resultClass} text-[12px] rounded">${resultText}</span>`;

    const tournamentName =
      game.tournamentName?.trim() ||
      i18next.t("settings.history.labels.tournamentFallback", "Tournament");
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
      : `<span class="text-[12px] text-blue-400">${i18next.t(
          "settings.history.badges.quick",
          "⚡ Quick Match",
        )}</span>`;

    const localizedTeammate = this.translatePlayerLabel(game.teammate);
    const teamInfo = localizedTeammate
      ? ` · ${i18next.t("settings.history.labels.with", "With:")} ${escapeHtml(
          localizedTeammate,
        )}`
      : "";

    const [typeLabel, typeBadgeClass] =
      matchType === "tournament"
        ? [
            i18next.t("settings.history.types.tournament", "Tournament"),
            "bg-purple-600/20 text-purple-200 border border-purple-400/20",
          ]
        : [
            i18next.t("settings.history.types.quick", "Quick Match"),
            "bg-cyan-600/20 text-cyan-100 border border-cyan-400/30",
          ];
    const localizedRoundLabel = this.translateTournamentRoundLabel(
      game.tournamentRound,
    );
    const roundBadge =
      matchType === "tournament" && localizedRoundLabel
        ? `<span class="px-2 py-0.5 bg-purple-500/10 text-purple-200 text-[11px] rounded border border-purple-400/30">${escapeHtml(localizedRoundLabel)}</span>`
        : "";
    const opponentLabel = this.localizeOpponentInfo(game.opponentInfo);

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
          ${i18next.t("settings.history.labels.score", "Score")}:
          <span class="font-semibold text-cyan-400">${game.myScore}</span>
          -
          <span class="font-semibold text-red-400">${game.opponentScore}</span>
          &nbsp;vs&nbsp;${escapeHtml(opponentLabel)}${teamInfo}
        </p>
      </div>
    </div>
  `;
  }

  private renderFilterControls(): string {
    const options: Array<{ value: HistoryFilter; label: string }> = [
      {
        value: "all",
        label: i18next.t("settings.history.filters.all", "All"),
      },
      {
        value: "quick",
        label: i18next.t("settings.history.filters.quick", "Quick"),
      },
      {
        value: "tournament",
        label: i18next.t("settings.history.filters.tournament", "Tournament"),
      },
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

  private translateTournamentRoundLabel(round?: string | null): string | null {
    if (!round) {
      return null;
    }
    const trimmed = round.trim();
    if (!trimmed) {
      return null;
    }

    const roundKey = ROUND_LABEL_LOOKUP.get(trimmed.toLowerCase());
    if (roundKey) {
      return i18next.t(`tournament.rounds.${roundKey}`, {
        defaultValue: trimmed,
      });
    }
    return trimmed;
  }

  private localizeOpponentInfo(opponentInfo?: string | null): string {
    if (!opponentInfo) {
      return "";
    }

    const localized = opponentInfo
      .split(/,\s*/)
      .map((segment) => this.translatePlayerLabel(segment))
      .filter((value): value is string => Boolean(value));
    if (localized.length === 0) {
      return opponentInfo.trim();
    }
    return localized.join(", ");
  }

  private translatePlayerLabel(label?: string | null): string | null {
    if (!label) {
      return null;
    }
    const trimmed = label.trim();
    if (!trimmed) {
      return null;
    }

    const aiMatch = trimmed.match(AI_NAME_REGEX);
    if (aiMatch) {
      const indexPart = aiMatch[1] ?? "";
      const difficultyRaw = aiMatch[2]?.trim() ?? "";
      const difficultyKey = this.getDifficultyKey(difficultyRaw);
      const localizedDifficulty = difficultyKey
        ? i18next.t(`playerSelector.difficulty.${difficultyKey}`, {
            defaultValue: difficultyRaw,
          })
        : difficultyRaw;

      return i18next.t("playerSelector.aiDisplayName", {
        index: indexPart,
        difficulty: localizedDifficulty,
        defaultValue: "AI {{index}} ({{difficulty}})",
      });
    }
    return trimmed;
  }

  private getDifficultyKey(label: string): "easy" | "medium" | "hard" | null {
    if (!label) {
      return null;
    }
    const normalized = normalizeDifficultyToken(label);
    return AI_DIFFICULTY_LOOKUP.get(normalized) ?? null;
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
    this.unsubscribeLanguage?.();
    this.unsubscribeLanguage = undefined;
  }
}
