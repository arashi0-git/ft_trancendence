import { RegisterService } from "./register.service";
import { SpacePageBase } from "../../shared/components/space-page-base";

export class RegisterPage extends SpacePageBase {
  private service: RegisterService;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new RegisterService();
  }

  render(): void {
    this.container.innerHTML = this.getTemplate();
    this.attachEventListeners();
    this.service.initializeRegisterForm();
    this.initializeSpaceBackground();
  }

  private getTemplate(): string {
    const content = `
      <div id="register-form-container">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-white">Create Account</h2>
          <button id="back-to-home" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded border border-purple-400">Home</button>
        </div>
        <!-- The registration form will be injected here by register.service.ts -->
      </div>
    `;
    return this.getSpaceTemplate(content);
  }

  private attachEventListeners(): void {
    document
      .getElementById("back-to-home")
      ?.addEventListener("click", () => this.service.navigateToHome());
  }

  destroy(): void {
    this.service.destroy();
    this.cleanupSpaceBackground();
  }
}
