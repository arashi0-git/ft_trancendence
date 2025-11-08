import { LoginForm } from "../../shared/components/login-form";
import { router } from "../../routes/router";

export class LoginService {
  initializeLoginForm(): void {
    const loginContainer = document.getElementById("login-form-container");
    if (loginContainer) {
      const loginForm = new LoginForm(loginContainer);

      loginForm.setOnLoginSuccess(() => {
        this.navigateAfterLogin();
      });

      loginForm.setOnShowRegister(() => {
        this.navigateToRegister();
      });

      loginForm.setOnShowHome(() => {
        this.navigateToHome();
      });
    }
  }

  navigateAfterLogin(): void {
    // Check if there's a stored return URL
    const returnUrl = sessionStorage.getItem("returnUrl");
    if (returnUrl) {
      sessionStorage.removeItem("returnUrl");
      this.navigate(returnUrl);
    } else {
      this.navigateToHome();
    }
  }

  navigateToHome(): void {
    this.navigate("/");
  }

  navigateToRegister(): void {
    this.navigate("/register");
  }

  private navigate(path: string): void {
    router.navigate(path);
  }
}
