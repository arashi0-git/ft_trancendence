import { AuthService } from "../../shared/services/auth-service";
import { NotificationService } from "../../shared/services/notification.service";
import { router } from "../../routes/router";

export class HomeService {
  navigateToQuickPlay(): void {
    this.navigate("/quick-play");
  }

  navigateToTournament(): void {
    this.navigate("/tournament");
  }

  navigateToAiMode(): void {
    this.navigate("/ai-mode");
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
