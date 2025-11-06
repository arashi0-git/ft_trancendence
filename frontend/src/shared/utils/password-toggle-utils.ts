import type { PasswordToggleTranslations } from "../types/translations";

const createToggleIcon = (isVisible: boolean, eyeIconUrl: string): string => {
  const slashMarkup = isVisible
    ? ""
    : `<span class="absolute block" style="width: 1.35rem; height: 2px; background-color: currentColor; transform: rotate(45deg); border-radius: 9999px;"></span>`;

  return `
    <span class="relative inline-flex h-5 w-5 items-center justify-center">
      <img src="${eyeIconUrl}" alt="" class="pointer-events-none h-5 w-5 object-contain" />
      ${slashMarkup}
    </span>
  `;
};

export const setupPasswordToggles = (
  container: HTMLElement,
  eyeIconUrl: string,
  labels?: PasswordToggleTranslations,
): void => {
  const showLabel = labels?.show || "Show password";
  const hideLabel = labels?.hide || "Hide password";
  const toggles =
    container.querySelectorAll<HTMLButtonElement>(".password-toggle");

  toggles.forEach((toggle) => {
    const targetId = toggle.dataset.target;
    const input = targetId
      ? container.querySelector<HTMLInputElement>(`#${CSS.escape(targetId)}`)
      : null;

    if (!input) {
      console.warn("Password toggle target not found.");
      return;
    }

    const applyState = (visible: boolean) => {
      input.type = visible ? "text" : "password";
      toggle.dataset.visible = String(visible);
      toggle.setAttribute("aria-label", visible ? hideLabel : showLabel);
      toggle.innerHTML = createToggleIcon(visible, eyeIconUrl);
    };

    const initialVisible = toggle.dataset.visible === "true";
    applyState(initialVisible);

    toggle.addEventListener("click", () => {
      const isVisible = toggle.dataset.visible === "true";
      applyState(!isVisible);
    });
  });
};
