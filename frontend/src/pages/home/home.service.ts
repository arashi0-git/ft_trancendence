import { router } from "../../routes/router";

export class HomeService {
  navigateToQuickPlay(): void {
    this.navigate("/quick-play");
  }

  navigateToTournament(): void {
    this.navigate("/tournament");
  }

  navigateToGameSettings(): void {
    this.navigate("/game-settings");
  }

  navigateToLogin(): void {
    this.navigate("/login");
  }

  navigateToRegister(): void {
    this.navigate("/register");
  }

  navigateToSettings(): void {
    this.navigate("/settings");
  }

  private navigate(path: string): void {
    router.navigate(path);
  }
}
