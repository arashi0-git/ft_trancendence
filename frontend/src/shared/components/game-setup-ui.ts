export interface GameSetupOption {
  value: string;
  text: string;
  disabled?: boolean;
}

export interface GameSetupConfig {
  showNameInput: boolean;
  options: GameSetupOption[];
  buttonText: string;
  nameInputId?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  nameDefaultValue?: string;
  selectId: string;
  selectLabel: string;
  buttonId: string;
}

export class GameSetupUI {
  getTemplate(config: GameSetupConfig): string {
    const nameInputHtml = config.showNameInput
      ? `
      <div>
        <label class="block text-sm font-medium text-white mb-2">${config.nameLabel}</label>
        <input
          type="text"
          id="${config.nameInputId}"
          placeholder="${config.namePlaceholder}"
          value="${config.nameDefaultValue}"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
      </div>`
      : "";

    const optionsHtml = config.options
      .map(
        (opt) =>
          `<option value="${opt.value}" ${opt.disabled ? "disabled" : ""}>${opt.text}</option>`,
      )
      .join("");

    return `
      <div class="space-y-4 max-w-sm mx-auto">
        ${nameInputHtml}
        <div>
          <label class="block text-sm font-medium text-white mb-2">${config.selectLabel}</label>
          <select id="${config.selectId}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            ${optionsHtml}
          </select>
        </div>
        <button id="${config.buttonId}" class="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded border border-green-400 shadow-lg">
          ${config.buttonText}
        </button>
      </div>
    `;
  }
}