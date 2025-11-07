import { PlayerSelector } from "./player-selector";
import type { PlayerOption } from "../types/tournament";
import { escapeHtml } from "../utils/html-utils";
import { formatTemplate } from "../types/translations";

type TranslationSection = Record<string, string>;

interface ManagerTranslations {
  selector?: TranslationSection;
  validation?: TranslationSection;
}

export interface PlayerRegistrationConfig {
  container: HTMLElement;
  playerCount: number;
  title?: string;
  subtitle?: string;
  startButtonId: string;
  requireHumanPlayer?: boolean;
  translations?: ManagerTranslations;
  onSelectionChange?: (selections: (PlayerOption | null)[]) => void;
  singleVsForFourPlayers?: boolean;
}

interface PlayerMetadata {
  position: string;
  controls: string;
  team: "left" | "right" | null;
}

export class PlayerRegistrationManager {
  private config: PlayerRegistrationConfig | null = null;
  private playerSelectors: PlayerSelector[] = [];
  private playerSelections: (PlayerOption | null)[] = [];

  constructor() {}

  private getPlayerMetadata(playerCount: number): PlayerMetadata[] {
    const metadata: Record<number, PlayerMetadata[]> = {
      2: [
        { position: "Left Paddle", controls: "W / S", team: "left" },
        { position: "Right Paddle", controls: "↑ / ↓", team: "right" },
      ],
      4: [
        { position: "Outer Paddle", controls: "W / S", team: "left" },
        { position: "Outer Paddle", controls: "↑ / ↓", team: "right" },
        { position: "Inner Paddle", controls: "R / F", team: "left" },
        { position: "Inner Paddle", controls: "I / K", team: "right" },
      ],
    };

    return metadata[playerCount] || [];
  }

  async render(config: PlayerRegistrationConfig): Promise<void> {
    try {
      this.destroy();
      this.config = config;

      if (!config.container) {
        throw new Error("Container element is required");
      }

      const titleHtml = config.title
        ? `<h3 class="text-lg font-semibold">${escapeHtml(config.title)}</h3>`
        : "";
      const subtitleHtml = config.subtitle
        ? `<p class="text-sm text-gray-300">${escapeHtml(config.subtitle)}</p>`
        : "";

      // Stack player rows vertically; each row handles its own layout
      const selectorsLayoutClass = "flex flex-col gap-6";

      config.container.innerHTML = `
        <div class="text-center mb-4">
          ${titleHtml}
          ${subtitleHtml}
        </div>

        <div id="player-side-headings" class="mb-2"></div>

        <div id="player-selectors" class="${selectorsLayoutClass} mb-4">
          </div>
      `;

      await this.generatePlayerSelectors();
    } catch (error) {
      console.error("PlayerRegistrationManager render failed:", error);
      this.destroy();
      throw error;
    }
  }

  private async generatePlayerSelectors(): Promise<void> {
    if (!this.config) {
      throw new Error("Configuration is not set");
    }

    const sideHeadingsContainer = document.getElementById(
      "player-side-headings",
    );
    const playerSelectorsContainer =
      document.getElementById("player-selectors");
    if (!playerSelectorsContainer) {
      throw new Error("Player selectors container not found");
    }

    const selectorTranslations = this.config.translations?.selector || {};
    const leftSideLabel = selectorTranslations.leftSideLabel || "Left Side";
    const rightSideLabel = selectorTranslations.rightSideLabel || "Right Side";
    const playerMetadata = this.getPlayerMetadata(this.config.playerCount);

    if (sideHeadingsContainer) {
      this.renderSideHeadings(
        sideHeadingsContainer,
        leftSideLabel,
        rightSideLabel,
      );
    }

    playerSelectorsContainer.innerHTML = "";
    this.cleanupPlayerSelectors();
    this.playerSelections = new Array(this.config.playerCount).fill(null);

    let successfulSelectors = 0;

    const useStackedVsLayout =
      Boolean(this.config.singleVsForFourPlayers) &&
      this.config.playerCount === 4;

    let currentRow: HTMLDivElement | null = null;
    let stackedColumns: {
      leftColumn: HTMLDivElement;
      rightColumn: HTMLDivElement;
    } | null = null;

    if (useStackedVsLayout) {
      const stackedWrapper = document.createElement("div");
      stackedWrapper.className =
        "flex flex-col gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-start sm:gap-8 lg:gap-12";
      playerSelectorsContainer.appendChild(stackedWrapper);

      const leftColumn = document.createElement("div");
      leftColumn.className = "flex flex-col gap-4";
      const vsDiv = this.createVsDivider(true);
      const rightColumn = document.createElement("div");
      rightColumn.className = "flex flex-col gap-4";

      stackedWrapper.appendChild(leftColumn);
      stackedWrapper.appendChild(vsDiv);
      stackedWrapper.appendChild(rightColumn);

      stackedColumns = { leftColumn, rightColumn };
    }

    for (let i = 1; i <= this.config.playerCount; i++) {
      if (!useStackedVsLayout && i % 2 === 1) {
        currentRow = document.createElement("div");
        currentRow.className =
          "flex flex-col items-stretch gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-8 lg:gap-12";
        playerSelectorsContainer.appendChild(currentRow);
      }

      const selectorDiv = document.createElement("div");
      const metadata = playerMetadata[i - 1];

      // Determine if this is left (odd) or right (even) player
      const isLeftSide = i % 2 === 1;
      const sideColorClass = isLeftSide
        ? "bg-blue-900 bg-opacity-20 border-l-4 border-blue-400"
        : "bg-red-900 bg-opacity-20 border-l-4 border-red-400";

      // Add position and control info if metadata exists
      if (metadata) {
        selectorDiv.className = `p-4 rounded-lg ${sideColorClass}`;

        // Add position and control info above the selector
        const infoDiv = document.createElement("div");
        infoDiv.className = "mb-2";
        infoDiv.innerHTML = `
          <div class="text-sm font-semibold text-white">${escapeHtml(metadata.position)}</div>
          <div class="text-xs text-gray-400">Controls: ${escapeHtml(metadata.controls)}</div>
        `;
        selectorDiv.appendChild(infoDiv);
      } else {
        selectorDiv.className = `p-2 ${sideColorClass}`;
      }

      let targetContainer: HTMLDivElement | null = null;

      if (useStackedVsLayout) {
        targetContainer = isLeftSide
          ? (stackedColumns?.leftColumn ?? null)
          : (stackedColumns?.rightColumn ?? null);
      } else {
        targetContainer = currentRow;
      }

      if (!targetContainer) {
        continue;
      }

      targetContainer.appendChild(selectorDiv);

      const shouldInsertVs =
        !useStackedVsLayout && isLeftSide && i + 1 <= this.config.playerCount;
      if (shouldInsertVs && currentRow) {
        currentRow.appendChild(this.createVsDivider(false));
      }

      const playerSelector = new PlayerSelector(selectorDiv, i);

      try {
        await playerSelector.render({
          translations: selectorTranslations,
        });

        playerSelector.setOnSelectionChange((playerOption) => {
          this.playerSelections[i - 1] = playerOption;
          this.validatePlayerSelections();
          this.config?.onSelectionChange?.(this.playerSelections);
        });

        // Get the current selection (which was set during render with default alias)
        const currentSelection = playerSelector.getCurrentSelection();
        if (currentSelection) {
          this.playerSelections[i - 1] = currentSelection;
        }

        this.playerSelectors.push(playerSelector);
        successfulSelectors++;
      } catch (error) {
        console.error(`Failed to render player selector ${i}:`, error);
        // セレクターの作成に失敗した場合、divを削除
        selectorDiv.remove();
      }
    }
    if (successfulSelectors === 0) {
      throw new Error("Failed to render any player selectors");
    }

    if (successfulSelectors < this.config.playerCount) {
      console.warn(
        `Only ${successfulSelectors} out of ${this.config.playerCount} player selectors were rendered successfully`,
      );
    }

    // Validate after all selectors are set up to enable start button if all defaults are valid
    this.validatePlayerSelections();
  }

  private renderSideHeadings(
    container: HTMLElement,
    leftLabel: string,
    rightLabel: string,
  ): void {
    container.innerHTML = "";

    if (!this.config || this.config.playerCount < 2) {
      return;
    }

    const mobileHeadings = document.createElement("div");
    mobileHeadings.className =
      "flex justify-between text-xs font-semibold uppercase tracking-wide text-gray-300 sm:hidden";
    mobileHeadings.innerHTML = `
      <span class="text-blue-200">${escapeHtml(leftLabel)}</span>
      <span class="text-red-200">${escapeHtml(rightLabel)}</span>
    `;
    container.appendChild(mobileHeadings);

    const desktopHeadings = document.createElement("div");
    desktopHeadings.className =
      "hidden sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:text-xs sm:font-semibold sm:uppercase sm:tracking-wide sm:text-gray-300";
    desktopHeadings.innerHTML = `
      <div class="text-blue-200">${escapeHtml(leftLabel)}</div>
      <div class="text-center text-gray-500"> </div>
      <div class="text-right text-red-200">${escapeHtml(rightLabel)}</div>
    `;
    container.appendChild(desktopHeadings);
  }

  private createVsDivider(stackedLayout: boolean): HTMLDivElement {
    const vsDiv = document.createElement("div");
    vsDiv.className = stackedLayout
      ? "text-center text-xl font-bold text-white tracking-wide sm:flex sm:items-center sm:justify-center sm:h-full"
      : "text-center text-xl font-bold text-white tracking-wide sm:flex sm:items-center sm:justify-center";
    vsDiv.textContent = "VS.";
    return vsDiv;
  }

  private validatePlayerSelections(): void {
    if (!this.config) return;

    const startBtn = document.getElementById(
      this.config.startButtonId,
    ) as HTMLButtonElement;

    const validationError = this.getValidationError();

    if (startBtn) {
      startBtn.disabled = validationError !== null;
    }
  }

  private getValidationError(): string | null {
    const validationMessages = this.config?.translations?.validation || {};

    const aliases = new Set<string>();
    let hasHumanPlayer = false;
    let missingPlayers = 0;
    let hasDuplicateNames = false;

    this.playerSelections.forEach((selection) => {
      if (!selection) {
        missingPlayers++;
        return;
      }
      if (!selection.isAI) {
        hasHumanPlayer = true;
      }
      const alias = selection.displayName.toLowerCase();
      if (aliases.has(alias)) {
        hasDuplicateNames = true;
      } else {
        aliases.add(alias);
      }
    });

    if (missingPlayers > 0) {
      return formatTemplate(
        validationMessages.missingPlayers ||
          "{{count}} players are not selected",
        { count: missingPlayers },
      );
    }
    if (hasDuplicateNames) {
      return validationMessages.duplicateNames || "Player names must be unique";
    }
    if (this.config?.requireHumanPlayer && !hasHumanPlayer) {
      return (
        validationMessages.requireHuman ||
        "Please select at least one human player"
      );
    }

    return null;
  }

  private cleanupPlayerSelectors(): void {
    this.playerSelectors.forEach((selector) => {
      selector.destroy();
    });
    this.playerSelectors = [];
    this.playerSelections = [];
  }

  public getPlayerSelections(): (PlayerOption | null)[] {
    return [...this.playerSelections];
  }

  public isValid(): boolean {
    return this.getValidationError() === null;
  }

  public reset(): void {
    if (!this.config) return;
    this.playerSelectors.forEach((selector) => {
      selector.reset();
    });
    this.playerSelections = new Array(this.config.playerCount).fill(null);
    this.validatePlayerSelections();
  }

  public destroy(): void {
    this.cleanupPlayerSelectors();
    this.config = null;
  }
}
