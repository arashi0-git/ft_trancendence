import { PlayerSelector } from "./player-selector";
import type { PlayerOption } from "../types/tournament";
import { translate } from "../../i18n";

export interface PlayerRegistrationConfig {
  container: HTMLElement;
  playerCount: number;
  title?: string;
  subtitle?: string;
  startButtonId: string;
  requireHumanPlayer?: boolean;
  onSelectionChange?: (selections: (PlayerOption | null)[]) => void;
}

export class PlayerRegistrationManager {
  private config: PlayerRegistrationConfig | null = null;
  private playerSelectors: PlayerSelector[] = [];
  private playerSelections: (PlayerOption | null)[] = [];

  async render(config: PlayerRegistrationConfig): Promise<void> {
    try {
      this.destroy();
      this.config = config;

      if (!config.container) {
        throw new Error("Container element is required");
      }

      const titleHtml = config.title
        ? `<h3 class="text-lg font-semibold">${this.escapeHtml(config.title)}</h3>`
        : "";
      const subtitleHtml = config.subtitle
        ? `<p class="text-sm text-gray-300">${this.escapeHtml(config.subtitle)}</p>`
        : "";

      config.container.innerHTML = `
				<div class="text-center mb-4">
					${titleHtml}
					${subtitleHtml}
				</div>

				<div id="player-selectors" class="space-y-4 mb-4">
					<!-- プレイヤー選択フィールド生成 -->
				</div>
			`;

      await this.generatePlayerSelectors();
      this.validatePlayerSelections();
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

    const playerSelectorsContainer =
      document.getElementById("player-selectors");
    if (!playerSelectorsContainer) {
      throw new Error("Player selectors container not found");
    }

    playerSelectorsContainer.innerHTML = "";
    this.cleanupPlayerSelectors();
    this.playerSelections = new Array(this.config.playerCount).fill(null);

    let successfulSelectors = 0;

    for (let i = 1; i <= this.config.playerCount; i++) {
      const selectorDiv = document.createElement("div");
      playerSelectorsContainer.appendChild(selectorDiv);

      const playerSelector = new PlayerSelector(selectorDiv, i);
      try {
        await playerSelector.render();

        playerSelector.setOnSelectionChange((playerOption) => {
          this.playerSelections[i - 1] = playerOption;
          this.validatePlayerSelections();
          this.config?.onSelectionChange?.(this.playerSelections);
        });

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
    const aliases = new Set<string>();
    let hasHumanPlayer = false;
    let missingPlayers = 0;
    let hasDuplicateNames = false;

    this.playerSelections.forEach((selection) => {
      if (!selection) {
        missingPlayers++;
        return;
      }

      // 人間プレイヤーがいるかチェック
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

    // エラーメッセージの優先順位
    if (missingPlayers > 0) {
      return translate("playerRegistration.missingPlayers", {
        count: missingPlayers,
      });
    }
    if (hasDuplicateNames) {
      return translate("playerRegistration.duplicateNames");
    }
    if (this.config?.requireHumanPlayer && !hasHumanPlayer) {
      return translate("playerRegistration.requireHuman");
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

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return String(text).replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
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
