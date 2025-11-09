import type { PlayerOption } from "../types/tournament";
import { formatTemplate } from "../types/translations";
import type { PlayerSelectorTranslations } from "../types/translations";
import { AuthService } from "../services/auth-service";
import { escapeHtml } from "../utils/html-utils";

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
  private loginUsername: string = "";

  constructor(container: HTMLElement, playerIndex: number) {
    this.container = container;
    this.playerIndex = playerIndex;
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

    const labelTemplate = this.t.label || "Player {{index}}";
    const label = formatTemplate(labelTemplate, {
      index: this.playerIndex,
    });
    const customOptionLabel = this.t.customOption || "Enter custom alias";
    const difficultyLabel = this.t.aiDifficulty || "AI Difficulty";
    const customAliasLabel = this.t.customAlias || "Custom Alias";
    const customAliasPlaceholder =
      this.t.customPlaceholder || "Enter custom alias";
    const userInfoLabel = this.t.loginUserNameLabel || "Username";

    const difficultyButtonsHtml = (["easy", "medium", "hard"] as const)
      .map((difficulty, index) => {
        const label = this.getDifficultyLabel(difficulty);
        const borderLeft = index > 0 ? "border-l border-gray-300" : "";
        return `
            <button type="button" class="ai-difficulty-btn flex-1 px-3 py-2 text-sm ${borderLeft}" data-difficulty="${difficulty}">
              ${escapeHtml(label)}
            </button>`;
      })
      .join("");

    this.container.innerHTML = `
      <div class="player-selector">
        <label class="block text-sm font-medium text-white mb-1">${escapeHtml(label)}</label>
        <div class="relative">
          <select id="player-${this.playerIndex}-select" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
            <option value="custom">${escapeHtml(customOptionLabel)}</option>
            ${playerOptions
              .map(
                (option) =>
                  `<option value="${escapeHtml(option.id)}" data-is-ai="${option.isAI}" data-ai-difficulty="${escapeHtml(option.aiDifficulty || "")}" data-user-id="${option.userId ?? ""}">${escapeHtml(option.displayName)}</option>`,
              )
              .join("")}
          </select>
        </div>

        <div id="player-details-${this.playerIndex}" class="mt-2 h-[80px]">
          <div id="custom-alias-${this.playerIndex}">
            <label class="block text-sm font-medium text-white mb-1">${escapeHtml(customAliasLabel)}</label>
            <input
              type="text"
              id="custom-alias-input-${this.playerIndex}"
              placeholder="${escapeHtml(customAliasPlaceholder)}"
              maxlength="20"
              class="w-full min-w-[280px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
          </div>

          <div id="ai-difficulty-${this.playerIndex}" class="hidden">
            <label class="block text-sm font-medium text-white mb-1">${escapeHtml(difficultyLabel)}</label>
            <div class="flex w-full min-w-[280px] h-[42px] border border-gray-300 rounded-md bg-white overflow-hidden">
              ${difficultyButtonsHtml}
            </div>
          </div>

          <div id="user-info-${this.playerIndex}" class="hidden">
            <label class="block text-sm font-medium text-white mb-1">${escapeHtml(userInfoLabel)}</label>
            <div id="user-name-display-${this.playerIndex}" class="w-full min-w-[280px] px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 overflow-hidden truncate"></div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners(this.getDefaultAlias());
  }

  private async getPlayerOptions(): Promise<PlayerOption[]> {
    const options: PlayerOption[] = [];

    // 1. ログインユーザーを追加（存在する場合）
    try {
      if (AuthService.isAuthenticated()) {
        const user = await AuthService.getCurrentUser();
        const username = user.username?.trim() ?? "";
        const actualUsername = username;
        const loginUserLabel = this.t.loginUserOption?.trim();
        options.push({
          id: `user-${user.id}`,
          displayName: escapeHtml(loginUserLabel || "login user"),
          isAI: false,
          userId: user.id,
        });
        // Store the actual username for later display
        this.loginUsername = actualUsername;
      }
    } catch (error) {
      console.warn("Failed to load current user:", error);
    }

    // 2. AIオプションを追加
    options.push({
      id: "ai",
      displayName: this.t.aiOption || "AI",
      isAI: true,
      aiDifficulty: "medium", // デフォルト難易度
    });

    return options;
  }

  private attachEventListeners(defaultAlias?: string): void {
    const select = this.container.querySelector(
      `#player-${this.playerIndex}-select`,
    ) as HTMLSelectElement;
    const aiDifficultyContainer = this.container.querySelector(
      `#ai-difficulty-${this.playerIndex}`,
    ) as HTMLElement;
    const customAliasContainer = this.container.querySelector(
      `#custom-alias-${this.playerIndex}`,
    ) as HTMLElement;
    const userInfoContainer = this.container.querySelector(
      `#user-info-${this.playerIndex}`,
    ) as HTMLElement;
    const userNameDisplay = this.container.querySelector(
      `#user-name-display-${this.playerIndex}`,
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

        // Hide all containers first
        aiDifficultyContainer?.classList.add("hidden");
        customAliasContainer?.classList.add("hidden");
        userInfoContainer?.classList.add("hidden");

        if (value === "custom") {
          // Show custom alias input
          customAliasContainer?.classList.remove("hidden");

          // Check if there's already a value in the input field
          const existingAlias = customAliasInput?.value.trim();
          if (existingAlias) {
            this.currentSelection = {
              id: `custom-${this.playerIndex}-${Date.now()}`,
              displayName: existingAlias,
              isAI: false,
            };
            this.onSelectionChange?.(this.currentSelection);
          } else {
            this.currentSelection = null;
            this.onSelectionChange?.(null);
          }
        } else if (value && selectedOption.dataset.isAi === "true") {
          // Show AI difficulty buttons
          aiDifficultyContainer?.classList.remove("hidden");
          this.setAIDifficultyButtons(datasetDifficulty);

          const difficultyLabel = this.getDifficultyLabel(datasetDifficulty);
          this.currentSelection = {
            id: value,
            displayName: formatTemplate(
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
          // Show username display
          userInfoContainer?.classList.remove("hidden");
          if (userNameDisplay) {
            // Display the actual username instead of "Login User"
            userNameDisplay.textContent =
              this.loginUsername || selectedOption.textContent || "";
          }

          this.currentSelection = {
            id: value,
            displayName: this.loginUsername || selectedOption.textContent || "",
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
          this.currentSelection.displayName = formatTemplate(
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

    if (defaultAlias) {
      this.setDefaultCustomAlias(defaultAlias);
    }
  }

  private setAIDifficultyButtons(
    selectedDifficulty: "easy" | "medium" | "hard",
  ): void {
    const buttons = this.container.querySelectorAll(".ai-difficulty-btn");
    const highlightColor = this.playerIndex % 2 === 1 ? "#1e3a8a" : "#7f1d1d";
    buttons.forEach((button) => {
      const btn = button as HTMLElement;
      if (btn.dataset.difficulty === selectedDifficulty) {
        btn.style.backgroundColor = highlightColor;
        btn.style.color = "white";
      } else {
        btn.style.backgroundColor = "";
        btn.style.color = "";
      }
    });
  }

  private getDifficultyLabel(difficulty: "easy" | "medium" | "hard"): string {
    const difficultyLabels = this.t.difficulty || {};
    return (
      difficultyLabels[difficulty] ??
      difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
    );
  }

  private getDefaultAlias(): string {
    return `guest${this.playerIndex}`;
  }

  private setDefaultCustomAlias(defaultAlias: string): void {
    const select = this.container.querySelector(
      `#player-${this.playerIndex}-select`,
    ) as HTMLSelectElement;
    const customAliasContainer = this.container.querySelector(
      `#custom-alias-${this.playerIndex}`,
    ) as HTMLElement;
    const customAliasInput = this.container.querySelector(
      `#custom-alias-input-${this.playerIndex}`,
    ) as HTMLInputElement;

    if (!select || !customAliasContainer || !customAliasInput) {
      return;
    }

    select.value = "custom";
    customAliasContainer.classList.remove("hidden");
    customAliasInput.value = defaultAlias;
    customAliasInput.dispatchEvent(new Event("input"));
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
    this.setDefaultCustomAlias(this.getDefaultAlias());
  }
}
