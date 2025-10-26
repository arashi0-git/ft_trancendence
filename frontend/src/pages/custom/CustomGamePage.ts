import { router } from "../../routes/router";

export class CustomGamePage {
  constructor(private container: HTMLElement) {}

  render(): void {
    this.container.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h1 class="text-2xl font-bold mb-4">Game Customization</h1>
        <p>Coming soon waku waku.</p>
        <button id="back-btn" class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded mt-4">
          Back to the main page
        </button>
      </div>
    `;
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    document.getElementById("back-btn")?.addEventListener("click", () => {
      router.navigate("/"); // Použijeme router pro návrat domů
    });
  }
}
