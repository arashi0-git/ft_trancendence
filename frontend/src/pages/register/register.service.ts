import { router } from "../../routes/router";

export class RegisterService {
  navigateToHome(): void {
    this.navigate("/");
  }

  private navigate(path: string): void {
    router.navigate(path);
  }
}
