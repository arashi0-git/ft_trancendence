import { LoginForm } from "../../shared/components/login-form";

export class LoginService {
  initializeLoginForm(): void {
    const loginContainer = document.getElementById("login-form-container");
    if (loginContainer) {
      const loginForm = new LoginForm(loginContainer);

      loginForm.setOnLoginSuccess(() => {
        this.navigateToHome();
      });

      loginForm.setOnShowRegister(() => {
        this.navigateToRegister();
      });
    }
  }

  navigateToHome(): void {
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  navigateToRegister(): void {
    window.history.pushState(null, "", "/register");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}
