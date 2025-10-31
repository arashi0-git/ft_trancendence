import { RegisterForm } from "../../shared/components/register-form";
import { router } from "../../routes/router";

export class RegisterService {
  private registerForm?: RegisterForm;

  initializeRegisterForm(): void {
    if (this.registerForm) {
      this.destroy();
    }

    const registerContainer = document.getElementById(
      "register-form-container",
    );

    if (!registerContainer) {
      console.error("Register form container not found");
      return;
    }

    this.registerForm = new RegisterForm(registerContainer);

    this.registerForm.setOnRegisterSuccess(() => {
      this.navigateToHome();
    });

    this.registerForm.setOnShowLogin(() => {
      this.navigateToLogin();
    });

    this.registerForm.setOnShowHome(() => {
      this.navigateToHome();
    });
  }

  navigateToHome(): void {
    this.navigate("/");
  }

  navigateToLogin(): void {
    this.navigate("/login");
  }

  destroy(): void {
    this.registerForm?.destroy();
    this.registerForm = undefined;
  }

  private navigate(path: string): void {
    router.navigate(path);
  }
}
