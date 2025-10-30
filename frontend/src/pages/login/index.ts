import { LoginService } from "./login.service";
import { SpacePageBase } from "../../shared/components/space-page-base";

export class LoginPage extends SpacePageBase {
  private service: LoginService;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new LoginService();
  }

  render(): void {
    const content = `<div id="login-form-container"></div>`;
    this.container.innerHTML = this.getSpaceTemplate(content);
    this.initializeAppHeader();
    this.service.initializeLoginForm();
    this.initializeSpaceBackground();
  }

  destroy(): void {
    this.cleanupSpaceBackground();
    this.cleanupAppHeader();
  }
}
