import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Env-gated SMTP mailer (works with Brevo, or any SMTP provider).
 *
 * Configure via .env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * When SMTP is not fully configured, sending is a silent no-op so the rest of
 * the app keeps working without email — exactly as the plan requires.
 *
 * DEV_EMAIL_OVERRIDE (optional):
 *   When set, ALL outgoing emails are redirected to this single address.
 *   Use this in development to avoid sending emails to real students.
 *   e.g. DEV_EMAIL_OVERRIDE=dev@example.com
 */

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

let transporter: Transporter | null = null;

function getTransport(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port,
    // 465 = implicit TLS; 587/others = STARTTLS.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!.trim(),
    },
  });
  return transporter;
}

function fromAddress(): string {
  const from = process.env.SMTP_FROM?.trim();
  if (from) return `DRISHTI <${from}>`;
  return `DRISHTI <${process.env.SMTP_USER?.trim()}>`;
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send an email. Never throws into the caller — failures are logged and
 * swallowed so a mail outage can't break a user action. Returns whether the
 * message was actually dispatched.
 *
 * DEV_EMAIL_OVERRIDE: if set in .env, all emails are redirected to that
 * address so real students are never emailed during local testing.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean }> {
  const transport = getTransport();
  if (!transport) return { sent: false };

  // In dev/test: redirect all emails to the override address
  const devOverride = process.env.DEV_EMAIL_OVERRIDE?.trim();
  const to = devOverride ?? input.to;
  if (devOverride) {
    const original = Array.isArray(input.to) ? input.to.join(", ") : input.to;
    console.log(`[DEV] Email redirected → ${devOverride} (original recipient: ${original})`);
  }

  try {
    await transport.sendMail({
      from: fromAddress(),
      to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? stripHtml(input.html),
    });
    return { sent: true };
  } catch (err) {
    console.error("sendEmail failed", err);
    return { sent: false };
  }
}

/** Verify the SMTP connection (used by an admin test action). */
export async function verifyEmailConnection(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const transport = getTransport();
  if (!transport) return { ok: false, error: "SMTP is not configured." };
  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
