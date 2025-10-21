import { RegisterService } from "./register.service.js";

export class RegisterPage {
  private service: RegisterService;
  private abortController?: AbortController;

  constructor(private container: HTMLElement) {
    this.service = new RegisterService();
  }

  render(): void {
    this.cleanup();
    this.abortController = new AbortController();
    this.container.innerHTML = this.getTemplate();
    this.attachEventListeners();
  }

  private getTemplate(): string {
    return `
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-4 text-center">Register</h2>
        <p class="text-center text-gray-600 mb-4">Registration form coming soon...</p>
        <button id="back-to-home" class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded">
          Back to Home
        </button>
      </div>
    `;
  }

  private attachEventListeners(): void {
    this.container
      .querySelector<HTMLElement>("#back-to-home")
      ?.addEventListener(
        "click",
        () => {
          this.service.navigateToHome();
        },
        { signal: this.abortController?.signal },
      );
  }

  cleanup(): void {
    this.abortController?.abort();
  }
}
