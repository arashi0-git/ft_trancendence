import { AuthService } from "../services/auth-service";
import { NotificationService } from "../services/notification.service";
import { router } from "../../routes/router";
import {
  i18next,
  SupportedLanguage,
  setLanguage,
  onLanguageChange,
} from "../../i18n";
import { escapeHtml } from "../utils/html-utils";

export class AppHeader {
  private container: HTMLElement;
  private unsubscribeLanguage?: () => void;
  private globalClickHandler?: (event: Event) => void;
  private eventListeners: Array<{
    element: EventTarget;
    event: string;
    handler: EventListener;
  }> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.unsubscribeLanguage = onLanguageChange(this.render.bind(this));
  }

  //コンポーネントを描画（表示）します。
  render(): void {
    this.destroyListeners();
    const template = this.getTemplate();
    this.container.innerHTML = template;
    this.attachEventListeners();
  }

  //メインのHTMLテンプレートを生成します。
  private getTemplate(): string {
    const authButtons = this.getAuthButtonsTemplate();
    const title = i18next.t("header.title", "ft_transcendence");

    return `
      <header class="p-4 bg-transparent">
        <div class="flex flex-col gap-4 sm:grid sm:grid-cols-[auto_1fr_auto] sm:gap-0 sm:items-center">
          <div class="hidden sm:block" aria-hidden="true"></div>
          <div class="text-center">
            <h1 class="text-3xl font-bold">
              <a
                href="/"
                id="app-title"
                class="text-white cursor-pointer transition-colors duration-200 hover:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white inline-block px-2 py-1 rounded-md"
              >
                ${title}
              </a>
            </h1>
          </div>
          <div class="flex flex-wrap justify-center sm:justify-end items-center gap-3">
            ${authButtons}
          </div>
        </div>
      </header>
    `;
  }

  private getAuthButtonsTemplate(): string {
    const currentPath = window.location.pathname;
    if (
      currentPath === "/quick-play/game" ||
      currentPath.startsWith("/tournament/match")
    ) {
      return "";
    }

    if (currentPath === "/login" || currentPath === "/register") {
      return "";
    }

    if (AuthService.isAuthenticated()) {
      const settingsLabel = i18next.t("header.settings", "Settings");
      const logoutLabel = i18next.t("header.logout", "Logout");
      return `
        <button id="header-settings-btn" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded text-sm transition-colors">
          ${settingsLabel}
        </button>
        <button id="header-logout-btn" class="text-white text-2xl p-2 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="${escapeHtml(
          logoutLabel,
        )}">
          <span aria-hidden="true">⍈</span>
        </button>
      `;
    }

    const loginLabel = i18next.t("header.login", "Login");
    const languageLabel = i18next.t("header.language", "Language");
    const trimmedLanguageLabel = languageLabel.trim();
    const languageEmoji = Array.from(trimmedLanguageLabel)[0] || "🌐";

    return `
      <button id="header-login-btn" class="text-white text-2xl p-2 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="${escapeHtml(loginLabel)}">
        <span aria-hidden="true">➜]</span>
      </button>
      <div class="relative">
        <button id="header-language-btn" type="button" class="text-white text-2xl p-2 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="${escapeHtml(
          languageLabel,
        )}">
          <span aria-hidden="true">${languageEmoji}</span>
        </button>
        <div id="header-language-menu" class="hidden absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded shadow-lg overflow-hidden z-10">
          <button type="button" id="header-lang-cs" class="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
            ${i18next.t("header.lang.cs", "🇨🇿 Čeština")}
          </button>
          <button type="button" id="header-lang-en" class="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
            ${i18next.t("header.lang.en", "🇬🇧 English")}
          </button>
          <button type="button" id="header-lang-jp" class="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
            ${i18next.t("header.lang.jp", "🇯🇵 日本語")}
          </button>
        </div>
      </div>
    `;
  }

  //全てのDOMイベントリスナーを設定します。
  private attachEventListeners(): void {
    this.bindClick("app-title", (event) => {
      event.preventDefault();
      router.navigate("/");
    });

    if (AuthService.isAuthenticated()) {
      this.bindClick("header-settings-btn", () => router.navigate("/settings"));
      this.bindClick("header-logout-btn", this.handleLogout.bind(this));
    } else {
      this.bindClick("header-login-btn", () => {
        // Store the current path to return to after login
        const currentPath = window.location.pathname;
        if (currentPath !== "/login" && currentPath !== "/register") {
          sessionStorage.setItem("returnUrl", currentPath);
        }
        router.navigate("/login");
      });
      this.bindClick("header-language-btn", this.toggleLanguageMenu.bind(this));
      this.bindClick("header-lang-cs", () => this.handleSetLanguage("cs"));
      this.bindClick("header-lang-en", () => this.handleSetLanguage("en"));
      this.bindClick("header-lang-jp", () => this.handleSetLanguage("jp"));

      if (!this.globalClickHandler) {
        this.globalClickHandler = (event: Event) => {
          this.handleDocumentClick(event);
        };
        this.bindEvent(window, "click", this.globalClickHandler);
      }
    }
  }

  // ID指定でクリックイベントを安全に設定します
  private bindClick(elementId: string, handler: (e: Event) => void): void {
    const element = document.getElementById(elementId);
    if (element) {
      this.bindEvent(element, "click", handler);
    }
  }

  // イベントリスナーを追跡リストに追加します
  private bindEvent(
    element: EventTarget,
    event: string,
    handler: EventListener,
  ): void {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  // 設定されたDOMイベントリスナーを全て解除します
  private destroyListeners(): void {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    if (this.globalClickHandler) {
      window.removeEventListener("click", this.globalClickHandler);
      this.globalClickHandler = undefined;
    }
  }

  //コンポーネントを破棄（クリーンアップ）します

  destroy(): void {
    this.destroyListeners();
    this.unsubscribeLanguage?.();
    this.unsubscribeLanguage = undefined;
  }

  //ログアウト処理を実行します
  private async handleLogout(): Promise<void> {
    try {
      await AuthService.logout();
      NotificationService.getInstance().success(
        i18next.t("header.logoutSuccess", "ログアウトしました"),
      );
      router.navigate("/");
    } catch (error) {
      NotificationService.getInstance().handleUnexpectedError(
        error,
        "Logout failed",
      );
      router.navigate("/");
    }
  }

  //言語メニューの表示・非表示を切り替えます
  private toggleLanguageMenu(event: Event): void {
    event.stopPropagation();
    const menu = document.getElementById("header-language-menu");
    menu?.classList.toggle("hidden");
  }

  //メニュー外のクリックを処理し、メニューを閉じます
  private handleDocumentClick(event: Event): void {
    const menu = document.getElementById("header-language-menu");
    const button = document.getElementById("header-language-btn");

    if (
      menu &&
      button &&
      !button.contains(event.target as Node) &&
      !menu.contains(event.target as Node)
    ) {
      menu.classList.add("hidden");
    }
  }

  // 言語変更を実行します
  private async handleSetLanguage(language: SupportedLanguage): Promise<void> {
    try {
      await setLanguage(language);
    } catch (error) {
      console.error("Failed to change language:", error);
    }
  }
}
