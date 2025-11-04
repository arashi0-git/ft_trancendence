import type { PlayerOption } from "../types/tournament";
import { AuthService } from "../services/auth-service";

interface DifficultyTranslations {
  easy?: string;
  medium?: string;
  hard?: string;
}
interface PlayerSelectorTranslations {
  label?: string;
  selectPlaceholder?: string;
  aiOption?: string;
  customOption?: string;
  aiDifficulty?: string;
  difficulty?: DifficultyTranslations;
  customAlias?: string;
  customPlaceholder?: string;
  currentUser?: string;
  aiDisplayName?: string;
}

export interface PlayerSelectorConfig {
  translations: PlayerSelectorTranslations;
}

export class PlayerSelector {
  private container: HTMLElement;
  private playerIndex: number;
  private onSelectionChange:
    | ((playerOption: PlayerOption | null) => void)
    | null = null;
  private currentSelection: PlayerOption | null = null;
  private eventListeners: Array<{
    element: Element;
    type: string;
    handler: EventListener;
  }> = [];
  private t: PlayerSelectorTranslations = {};

  constructor(container: HTMLElement, playerIndex: number) {
    this.container = container;
    this.playerIndex = playerIndex;
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private addEventListener(
    element: Element,
    type: string,
    handler: EventListener,
  ): void {
    element.addEventListener(type, handler);
    this.eventListeners.push({ element, type, handler });
  }

  public destroy(): void {
    this.eventListeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    this.eventListeners = [];
  }

  async render(config: PlayerSelectorConfig): Promise<void> {
    // 既存のイベントリスナーをクリア
    this.destroy();
    this.t = config.translations || {};

    const playerOptions = await this.getPlayerOptions();

    const label = this.formatText(this.t.label || "Player {{index}}", {
      index: this.playerIndex,
    });
    const placeholder = this.t.selectPlaceholder || "Select player or AI";
    const customOptionLabel = this.t.customOption || "Enter custom alias";
    const difficultyLabel = this.t.aiDifficulty || "AI Difficulty";
    const customAliasLabel = this.t.customAlias || "Custom Alias";
    const customAliasPlaceholder =
      this.t.customPlaceholder || "Enter custom alias";

    const difficultyButtonsHtml = (["easy", "medium", "hard"] as const)
      .map((difficulty) => {
        const label = this.getDifficultyLabel(difficulty);
        return `
            <button type="button" class="ai-difficulty-btn px-3 py-1 text-xs rounded border" data-difficulty="${difficulty}">
              ${this.escapeHtml(label)}
            </button>`;
      })
      .join("");

    this.container.innerHTML = `
      <div class="player-selector">
        <label class="block text-sm font-medium text-white mb-1">${this.escapeHtml(label)}</label>
        <div class="relative">
          <select id="player-${this.playerIndex}-select" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
            <option value="">${this.escapeHtml(placeholder)}</option>
            ${playerOptions
              .map(
                (option) =>
                  `<option value="${this.escapeHtml(option.id)}" data-is-ai="${option.isAI}" data-ai-difficulty="${this.escapeHtml(option.aiDifficulty || "")}" data-user-id="${option.userId ?? ""}">${this.escapeHtml(option.displayName)}</option>`,
              )
              .join("")}
            <option value="custom">${this.escapeHtml(customOptionLabel)}</option>
          </select>
        </div>
        
        <div id="ai-difficulty-${this.playerIndex}" class="mt-2 hidden">
          <label class="block text-sm font-medium text-white mb-1">${this.escapeHtml(difficultyLabel)}</label>
          <div class="flex space-x-2">
            ${difficultyButtonsHtml}
          </div>
        </div>
        
        <div id="custom-alias-${this.playerIndex}" class="mt-2 hidden">
          <label class="block text-sm font-medium text-white mb-1">${this.escapeHtml(customAliasLabel)}</label>
          <input
            type="text"
            id="custom-alias-input-${this.playerIndex}"
            placeholder="${this.escapeHtml(customAliasPlaceholder)}"
            maxlength="20"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private async getPlayerOptions(): Promise<PlayerOption[]> {
    const options: PlayerOption[] = [];

    // ログインユーザーを追加
    try {
      if (AuthService.isAuthenticated()) {
        const user = await AuthService.getCurrentUser();
        options.push({
          id: `user-${user.id}`,
          displayName: this.formatText(this.t.currentUser || "{{username}}", {
            username: user.username,
          }),
          isAI: false,
          userId: user.id,
        });
      }
    } catch (error) {
      console.warn("Failed to load current user:", error);
    }

    // AIオプションを1つだけ追加
    options.push({
      id: "ai",
      displayName: this.t.aiOption || "AI",
      isAI: true,
      aiDifficulty: "medium", // デフォルト難易度
    });

    return options;
  }

  private attachEventListeners(): void {
    const select = this.container.querySelector(
      `#player-${this.playerIndex}-select`,
    ) as HTMLSelectElement;
    const aiDifficultyContainer = this.container.querySelector(
      `#ai-difficulty-${this.playerIndex}`,
    ) as HTMLElement;
    const customAliasContainer = this.container.querySelector(
      `#custom-alias-${this.playerIndex}`,
    ) as HTMLElement;
    const customAliasInput = this.container.querySelector(
      `#custom-alias-input-${this.playerIndex}`,
    ) as HTMLInputElement;

    if (select) {
      this.addEventListener(select, "change", () => {
        const selectedOption = select.options[select.selectedIndex];
        const value = selectedOption.value;
        const datasetDifficulty = (selectedOption.dataset.aiDifficulty ||
          "medium") as "easy" | "medium" | "hard";

        // コンテナを隠す
        aiDifficultyContainer?.classList.add("hidden");
        customAliasContainer?.classList.add("hidden");

        if (value === "custom") {
          // カスタムエイリアス入力を表示
          customAliasContainer?.classList.remove("hidden");
          this.currentSelection = null;
          this.onSelectionChange?.(null);
        } else if (value && selectedOption.dataset.isAi === "true") {
          // AIが選択された場合、難易度選択を表示
          aiDifficultyContainer?.classList.remove("hidden");
          this.setAIDifficultyButtons(datasetDifficulty); // デフォルトはmedium

          const difficultyLabel = this.getDifficultyLabel(datasetDifficulty);
          this.currentSelection = {
            id: value,
            displayName: this.formatText(
              this.t.aiDisplayName || "AI ({{difficulty}})",
              {
                index: this.playerIndex,
                difficulty: difficultyLabel,
              },
            ),
            isAI: true,
            aiDifficulty: datasetDifficulty,
          };
          this.onSelectionChange?.(this.currentSelection);
        } else if (value) {
          // 人間プレイヤーが選択された場合
          this.currentSelection = {
            id: value,
            displayName: selectedOption.textContent || "",
            isAI: false,
            userId: selectedOption.dataset.userId
              ? Number.isNaN(parseInt(selectedOption.dataset.userId, 10))
                ? undefined
                : parseInt(selectedOption.dataset.userId, 10)
              : undefined,
          };
          this.onSelectionChange?.(this.currentSelection);
        } else {
          this.currentSelection = null;
          this.onSelectionChange?.(null);
        }
      });
    }

    // AI難易度ボタンのイベントリスナー
    const difficultyButtons =
      this.container.querySelectorAll(".ai-difficulty-btn");
    difficultyButtons.forEach((button) => {
      this.addEventListener(button, "click", () => {
        const difficulty = (button as HTMLElement).dataset.difficulty as
          | "easy"
          | "medium"
          | "hard";
        this.setAIDifficultyButtons(difficulty);

        if (this.currentSelection?.isAI) {
          this.currentSelection.aiDifficulty = difficulty;
          this.currentSelection.displayName = this.formatText(
            this.t.aiDisplayName || "AI ({{difficulty}})",
            {
              index: this.playerIndex,
              difficulty: this.getDifficultyLabel(difficulty),
            },
          );
          this.onSelectionChange?.(this.currentSelection);
        }
      });
    });

    // カスタムエイリアス入力のイベントリスナー
    if (customAliasInput) {
      this.addEventListener(customAliasInput, "input", () => {
        const alias = customAliasInput.value.trim();
        if (alias) {
          this.currentSelection = {
            id: `custom-${this.playerIndex}-${Date.now()}`,
            displayName: alias,
            isAI: false,
          };
          this.onSelectionChange?.(this.currentSelection);
        } else {
          this.currentSelection = null;
          this.onSelectionChange?.(null);
        }
      });
    }
  }

  private setAIDifficultyButtons(
    selectedDifficulty: "easy" | "medium" | "hard",
  ): void {
    const buttons = this.container.querySelectorAll(".ai-difficulty-btn");
    buttons.forEach((button) => {
      const btn = button as HTMLElement;
      if (btn.dataset.difficulty === selectedDifficulty) {
        btn.classList.add("bg-blue-500", "text-white");
        btn.classList.remove("bg-gray-200", "text-gray-700");
      } else {
        btn.classList.add("bg-gray-200", "text-gray-700");
        btn.classList.remove("bg-blue-500", "text-white");
      }
    });
  }

  private formatText(
    template: string,
    variables: Record<string, string | number>,
  ): string {
    return Object.entries(variables).reduce(
      (acc, [key, value]) =>
        acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value)),
      template,
    );
  }

  private getDifficultyLabel(difficulty: "easy" | "medium" | "hard"): string {
    const difficultyLabels = this.t.difficulty || {};
    return (
      difficultyLabels[difficulty] ??
      difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
    );
  }

  public setOnSelectionChange(
    callback: (playerOption: PlayerOption | null) => void,
  ): void {
    this.onSelectionChange = callback;
  }

  public getCurrentSelection(): PlayerOption | null {
    return this.currentSelection;
  }

  public reset(): void {
    const select = this.container.querySelector(
      `#player-${this.playerIndex}-select`,
    ) as HTMLSelectElement;
    if (select) {
      select.value = "";
    }

    const aiDifficultyContainer = this.container.querySelector(
      `#ai-difficulty-${this.playerIndex}`,
    ) as HTMLElement;
    const customAliasContainer = this.container.querySelector(
      `#custom-alias-${this.playerIndex}`,
    ) as HTMLElement;

    aiDifficultyContainer?.classList.add("hidden");
    customAliasContainer?.classList.add("hidden");

    this.currentSelection = null;
    this.onSelectionChange?.(null);
  }
}
