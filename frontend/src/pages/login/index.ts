import { LoginService } from "./login.service";

export class LoginPage {
  private service: LoginService;

  constructor(private container: HTMLElement) {
    this.service = new LoginService();
  }

  render(): void {
    this.container.innerHTML = `<div id="login-form-container"></div>`;
    this.service.initializeLoginForm();
  }
}
