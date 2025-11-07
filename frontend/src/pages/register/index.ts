import { SpacePageBase } from "../../shared/components/space-page-base";
import { i18next } from "../../i18n";
import type {
  RegisterPageTranslations,
  RegisterTranslations,
} from "../../shared/types/translations";
import { RegisterService } from "./register.service";

export class RegisterPage extends SpacePageBase {
  private service: RegisterService;
  private backToHomeEl: HTMLButtonElement | null = null;
  private onBackToHomeClick = () => this.service.navigateToHome();
  private translations: RegisterTranslations = {};

  constructor(container: HTMLElement) {
    super(container);
    this.service = new RegisterService();
  }

  render(): void {
    this.translations =
      (i18next.t("register", {
        returnObjects: true,
      }) as RegisterTranslations) || {};
    const content = this.getTemplate(this.translations.page || {});
    this.container.innerHTML = this.getSpaceTemplate(content);
    this.initializeAppHeader();
    this.attachEventListeners();
    this.service.initializeRegisterForm();
    this.initializeSpaceBackground();
  }

  private getTemplate(pageTranslations: RegisterPageTranslations): string {
    const heading = pageTranslations.heading || "Create Account";
    const homeLabel = pageTranslations.home || "Home";
    const content = `
      <div id="register-form-container">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-white">${heading}</h2>
          <button id="back-to-home" class="bg-purple-400 hover:bg-purple-600 text-white px-4 py-2 rounded border border-purple-400">${homeLabel}</button>
        </div>
        <!-- The registration form will be injected here by register.service.ts -->
      </div>
    `;
    return content;
  }

  private attachEventListeners(): void {
    this.backToHomeEl =
      this.container.querySelector<HTMLButtonElement>("#back-to-home");
    this.backToHomeEl?.addEventListener("click", this.onBackToHomeClick);
  }

  destroy(): void {
    this.backToHomeEl?.removeEventListener("click", this.onBackToHomeClick);
    this.backToHomeEl = null;
    this.service.destroy();
    this.cleanupSpaceBackground();
    this.cleanupAppHeader();
  }
}
