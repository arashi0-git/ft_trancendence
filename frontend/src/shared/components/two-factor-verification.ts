import { NotificationService } from "../services/notification.service";
import { i18next } from "../../i18n";

export interface TwoFactorVerificationOptions {
  message: string;
  verifyLabel?: string;
  resendLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  onSubmit: (code: string) => Promise<void>;
  onResend?: () => Promise<void>;
  onCancel?: () => void;
}

export class TwoFactorVerification {
  private container: HTMLElement;
  private notificationService = NotificationService.getInstance();
  private options: Required<
    Omit<TwoFactorVerificationOptions, "onResend" | "onCancel">
  > & {
    onResend?: () => Promise<void>;
    onCancel?: () => void;
  };
  private elements!: {
    message: HTMLElement;
    form: HTMLFormElement;
    input: HTMLInputElement;
    submit: HTMLButtonElement;
    resend: HTMLButtonElement | null;
    cancel: HTMLButtonElement | null;
  };

  constructor(container: HTMLElement, options: TwoFactorVerificationOptions) {
    this.container = container;
    this.options = {
      message: options.message,
      verifyLabel:
        options.verifyLabel ??
        i18next.t("twoFactor.dialog.submit", "Verify Code"),
      resendLabel:
        options.resendLabel ??
        i18next.t("twoFactor.dialog.resend", "Resend email code"),
      cancelLabel:
        options.cancelLabel ?? i18next.t("twoFactor.dialog.cancel", "Cancel"),
      showCancel: options.showCancel ?? true,
      onSubmit: options.onSubmit,
      onResend: options.onResend,
      onCancel: options.onCancel,
    };

    this.render();
    this.attachListeners();
  }

  private render(): void {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className =
      "border border-cyan-500/30 rounded-lg p-6 bg-gray-900/95 shadow-xl backdrop-blur-sm";

    const title = document.createElement("h2");
    title.className = "text-2xl font-bold mb-4 text-center text-cyan-200";
    title.textContent = i18next.t(
      "twoFactor.dialog.title",
      "Two-Factor Verification",
    );

    const message = document.createElement("p");
    message.dataset.message = "";
    message.className = "text-sm text-gray-300 mb-2";
    message.textContent = this.options.message;

    const form = document.createElement("form");
    form.className = "space-y-4";

    const inputBlock = document.createElement("div");
    inputBlock.className = "space-y-2";

    const labelRow = document.createElement("div");
    labelRow.className = "flex items-center justify-between";

    const label = document.createElement("label");
    label.htmlFor = "code";
    label.className = "text-sm font-medium text-gray-200";
    label.textContent = i18next.t(
      "twoFactor.dialog.codeLabel",
      "Verification Code",
    );

    let resendButton: HTMLButtonElement | null = null;
    if (this.options.onResend) {
      resendButton = document.createElement("button");
      resendButton.type = "button";
      resendButton.dataset.resend = "";
      resendButton.className = "text-cyan-300 hover:text-cyan-200 text-sm";
      resendButton.textContent = this.options.resendLabel;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.id = "code";
    input.name = "code";
    input.pattern = "\\d{6}";
    input.maxLength = 6;
    input.required = true;
    input.inputMode = "numeric";
    input.className =
      "block w-full px-3 py-2 bg-gray-950 border border-cyan-500/40 rounded-md shadow-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 tracking-widest text-center";
    input.placeholder = i18next.t("twoFactor.dialog.codePlaceholder", "123456");

    labelRow.appendChild(label);
    if (resendButton) {
      labelRow.appendChild(resendButton);
    }

    inputBlock.appendChild(labelRow);
    inputBlock.appendChild(input);

    const actions = document.createElement("div");
    actions.className = "space-y-2";

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.dataset.submit = "";
    submit.className =
      "w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded disabled:opacity-60";
    submit.textContent = this.options.verifyLabel;

    let cancelButton: HTMLButtonElement | null = null;
    if (this.options.showCancel && this.options.onCancel) {
      cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.dataset.cancel = "";
      cancelButton.className =
        "w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded";
      cancelButton.textContent = this.options.cancelLabel;
    }

    actions.appendChild(submit);
    if (cancelButton) {
      actions.appendChild(cancelButton);
    }

    form.appendChild(inputBlock);
    form.appendChild(actions);

    wrapper.appendChild(title);
    wrapper.appendChild(message);
    wrapper.appendChild(form);

    this.container.appendChild(wrapper);

    this.elements = {
      message,
      form,
      input,
      submit,
      resend: resendButton,
      cancel: cancelButton,
    };
  }

  private attachListeners(): void {
    this.elements.form.addEventListener("submit", (e) => this.handleSubmit(e));
    this.elements.resend?.addEventListener("click", () => this.handleResend());
    this.elements.cancel?.addEventListener("click", () => {
      if (this.options.onCancel) {
        this.options.onCancel();
      }
    });
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const code = this.elements.input.value.trim();

    if (!/^\d{6}$/.test(code)) {
      this.notificationService.warning(
        i18next.t("notifications.twoFactorCodePrompt"),
      );
      return;
    }

    this.setLoading(true);
    try {
      await this.options.onSubmit(code);
    } finally {
      this.setLoading(false);
    }
  }

  private async handleResend(): Promise<void> {
    if (!this.options.onResend) return;

    this.setResendLoading(true);

    try {
      await this.options.onResend();
    } catch (error) {
      this.notificationService.apiError(error, {
        fallbackMessage: i18next.t(
          "notifications.twoFactorResendFailed",
          "Failed to resend code. Please try again.",
        ),
      });
    } finally {
      this.setResendLoading(false);
    }
  }

  private setLoading(loading: boolean): void {
    this.elements.submit.disabled = loading;
    this.elements.submit.textContent = loading
      ? i18next.t("twoFactor.dialog.verifying", "Verifying...")
      : this.options.verifyLabel;
    if (this.elements.resend) this.elements.resend.disabled = loading;
    if (this.elements.cancel) this.elements.cancel.disabled = loading;
  }

  private setResendLoading(loading: boolean): void {
    if (!this.elements.resend) return;
    this.elements.resend.disabled = loading;
    this.elements.resend.textContent = loading
      ? i18next.t("twoFactor.dialog.resending", "Resending...")
      : this.options.resendLabel;
    this.elements.submit.disabled = loading;
    if (this.elements.cancel) this.elements.cancel.disabled = loading;
  }

  // Public API
  public updateMessage(message: string): void {
    this.elements.message.textContent = message;
  }

  public resetCode(): void {
    this.elements.input.value = "";
  }

  public focus(): void {
    this.elements.input.focus();
  }

  public destroy(): void {
    this.container.innerHTML = "";
  }
}
