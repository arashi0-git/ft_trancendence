import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, SMTP_FROM } =
  process.env;

function buildTransport() {
  if (!SMTP_HOST || !SMTP_PORT) {
    return null;
  }

  const port = Number(SMTP_PORT);
  const secure =
    SMTP_SECURE !== undefined ? SMTP_SECURE === "true" : Number(port) === 465;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth:
      SMTP_USER && SMTP_PASS
        ? {
            user: SMTP_USER,
            pass: SMTP_PASS,
          }
        : undefined,
  });
}

const transport = buildTransport();

export class EmailService {
  static async sendTwoFactorCode(to: string, code: string): Promise<void> {
    if (!transport) {
      console.warn(
        "[EmailService] SMTP not configured; two-factor code:",
        code,
      );
      return;
    }

    const fromAddress = SMTP_FROM || SMTP_USER;
    if (!fromAddress) {
      console.warn(
        "[EmailService] SMTP_FROM/SMTP_USER missing; unable to send email. Code:",
        code,
      );
      return;
    }

    await transport.sendMail({
      from: fromAddress,
      to,
      subject: "Your Two-Factor Authentication Code",
      text: `Your security code is ${code}. It will expire in 10 minutes.`,
      html: `<p>Your security code is <strong>${code}</strong>.</p><p>This code will expire in 10 minutes.</p>`,
    });
  }
}
