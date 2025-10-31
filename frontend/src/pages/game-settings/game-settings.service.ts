import { router } from "../../routes/router";

export class GameSettingsService {
  navigateToHome(): void {
    router.navigate("/");
  }
}
