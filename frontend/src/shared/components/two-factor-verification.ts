export interface TwoFactorVerificationOptions {
  mode?: "inline" | "modal";
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
  private options: Required<
    Omit<TwoFactorVerificationOptions, "onResend" | "onCancel">
  > & {
    onResend?: () => Promise<void>;
    onCancel?: () => void;
  };
  private readonly isModal: boolean;
  private elements!: {
    message: HTMLElement;
    form: HTMLFormElement;
    input: HTMLInputElement;
    error: HTMLElement;
    feedback: HTMLElement;
    submit: HTMLButtonElement;
    resend: HTMLButtonElement | null;
    cancel: HTMLButtonElement | null;
  };

  constructor(container: HTMLElement, options: TwoFactorVerificationOptions) {
    this.container = container;
    this.options = {
      mode: options.mode ?? "inline",
      message: options.message,
      verifyLabel: options.verifyLabel ?? "Verify Code",
      resendLabel: options.resendLabel ?? "Resend email code",
      cancelLabel: options.cancelLabel ?? "Cancel",
      showCancel: options.showCancel ?? true,
      onSubmit: options.onSubmit,
      onResend: options.onResend,
      onCancel: options.onCancel,
    };

    this.isModal = this.options.mode === "modal";

    this.render();
    this.attachListeners();
  }

  private render(): void {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = this.isModal
      ? "border border-cyan-500/30 rounded-lg p-6 bg-gray-900/95 shadow-xl backdrop-blur-sm"
      : "border border-gray-200 rounded-lg p-6 bg-white shadow-sm";

    const title = document.createElement("h2");
    title.className = this.isModal
      ? "text-2xl font-bold mb-4 text-center text-cyan-200"
      : "text-2xl font-bold mb-4 text-center text-gray-900";
    title.textContent = "Two-Factor Verification";

    const message = document.createElement("p");
    message.dataset.message = "";
    message.className = this.isModal
      ? "text-sm text-gray-300 mb-2"
      : "text-sm text-gray-500 mb-2";
    message.textContent = this.options.message;

    const feedback = document.createElement("p");
    feedback.dataset.feedback = "";
    feedback.className = this.isModal
      ? "hidden text-sm mb-4 text-gray-300"
      : "hidden text-sm mb-4 text-gray-500";
    feedback.setAttribute("role", "status");

    const form = document.createElement("form");
    form.className = "space-y-4";

    const inputBlock = document.createElement("div");
    inputBlock.className = "space-y-2";

    const labelRow = document.createElement("div");
    labelRow.className = "flex items-center justify-between";

    const label = document.createElement("label");
    label.htmlFor = "code";
    label.className = this.isModal
      ? "text-sm font-medium text-gray-200"
      : "text-sm font-medium text-gray-700";
    label.textContent = "Verification Code";

    let resendButton: HTMLButtonElement | null = null;
    if (this.options.onResend) {
      resendButton = document.createElement("button");
      resendButton.type = "button";
      resendButton.dataset.resend = "";
      resendButton.className = this.isModal
        ? "text-cyan-300 hover:text-cyan-200 text-sm"
        : "text-blue-600 hover:underline text-sm";
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
    input.className = this.isModal
      ? "block w-full px-3 py-2 bg-gray-950 border border-cyan-500/40 rounded-md shadow-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 tracking-widest text-center"
      : "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 tracking-widest text-center";
    input.placeholder = "123456";

    labelRow.appendChild(label);
    if (resendButton) {
      labelRow.appendChild(resendButton);
    }

    inputBlock.appendChild(labelRow);
    inputBlock.appendChild(input);

    const error = document.createElement("div");
    error.dataset.error = "";
    error.className = this.isModal
      ? "hidden text-sm text-red-300"
      : "hidden text-sm text-red-600";

    const actions = document.createElement("div");
    actions.className = "space-y-2";

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.dataset.submit = "";
    submit.className = this.isModal
      ? "w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded disabled:opacity-60"
      : "w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-60";
    submit.textContent = this.options.verifyLabel;

    let cancelButton: HTMLButtonElement | null = null;
    if (this.options.showCancel && this.options.onCancel) {
      cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.dataset.cancel = "";
      cancelButton.className = this.isModal
        ? "w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
        : "w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded";
      cancelButton.textContent = this.options.cancelLabel;
    }

    actions.appendChild(submit);
    if (cancelButton) {
      actions.appendChild(cancelButton);
    }

    form.appendChild(inputBlock);
    form.appendChild(error);
    form.appendChild(actions);

    wrapper.appendChild(title);
    wrapper.appendChild(message);
    wrapper.appendChild(feedback);
    wrapper.appendChild(form);

    this.container.appendChild(wrapper);

    this.elements = {
      message,
      form,
      input,
      error,
      feedback,
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
      this.showError("Enter the 6-digit code from your email.");
      return;
    }

    this.clearError();
    this.clearFeedback();
    this.setLoading(true);

    try {
      await this.options.onSubmit(code);
    } catch (error) {
      this.showError(
        error instanceof Error ? error.message : "Verification failed",
      );
    } finally {
      this.setLoading(false);
    }
  }

  private async handleResend(): Promise<void> {
    if (!this.options.onResend) return;

    this.clearError();
    this.clearFeedback();
    this.setResendLoading(true);

    try {
      await this.options.onResend();
    } catch (error) {
      this.showError(
        error instanceof Error ? error.message : "Failed to resend code",
      );
    } finally {
      this.setResendLoading(false);
    }
  }

  private setLoading(loading: boolean): void {
    this.elements.submit.disabled = loading;
    this.elements.submit.textContent = loading
      ? "Verifying..."
      : this.options.verifyLabel;
    if (this.elements.resend) this.elements.resend.disabled = loading;
    if (this.elements.cancel) this.elements.cancel.disabled = loading;
  }

  private setResendLoading(loading: boolean): void {
    if (!this.elements.resend) return;
    this.elements.resend.disabled = loading;
    this.elements.resend.textContent = loading
      ? "Resending..."
      : this.options.resendLabel;
    this.elements.submit.disabled = loading;
    if (this.elements.cancel) this.elements.cancel.disabled = loading;
  }

  // Public API
  public updateMessage(message: string): void {
    this.elements.message.textContent = message;
  }

  public showError(message: string): void {
    this.elements.error.textContent = message;
    this.elements.error.classList.remove("hidden");
  }

  public clearError(): void {
    this.elements.error.classList.add("hidden");
    this.elements.error.textContent = "";
  }

  public showFeedback(
    message: string,
    variant: "success" | "info" | "error" = "success",
  ): void {
    const colors = {
      success: this.isModal ? "text-green-300" : "text-green-600",
      info: this.isModal ? "text-cyan-300" : "text-blue-600",
      error: this.isModal ? "text-red-300" : "text-red-600",
    };
    this.elements.feedback.textContent = message;
    this.elements.feedback.className = `text-sm mb-4 ${colors[variant]}`;
    this.elements.feedback.classList.remove("hidden");
  }

  public clearFeedback(): void {
    const baseColor = this.isModal ? "text-gray-300" : "text-gray-500";
    this.elements.feedback.className = `hidden text-sm mb-4 ${baseColor}`;
    this.elements.feedback.textContent = "";
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
