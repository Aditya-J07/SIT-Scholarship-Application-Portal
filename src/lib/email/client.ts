import nodemailer, { Transporter } from 'nodemailer';
import { EmailEventType, EmailRenderInput } from './types';
import { renderEmail } from './templates';

export interface SendEmailOptions {
  to: string;
  type: EmailEventType;
  input: EmailRenderInput;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    // Reasonable connection timeouts so API routes don't hang if SMTP is unresponsive
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });

  return transporter;
}

/**
 * Sends real email notifications using SMTP.
 *
 * Privacy & Security Guarantees:
 * - Logs strictly event types and reference numbers only.
 * - Never prints, logs or leaks student email addresses, names, or message bodies.
 * - If no SMTP provider is configured:
 *     - In development: logs a warning with event type & ref no only.
 *     - In production: fails safely (logs error with type & ref only); caller action still succeeds.
 */
export async function sendEmailNotification(options: SendEmailOptions): Promise<boolean> {
  const { to, type, input } = options;
  const refNo = input.refNo || 'N/A';

  const smtpClient = getTransporter();

  // If no SMTP provider is configured:
  if (!smtpClient) {
    if (process.env.NODE_ENV === 'production') {
      // Production fail-safe: log sanitized error without PII, main action continues
      console.error(`[NOTIFICATION_FAILED] Type: ${type} | Ref: ${refNo}`);
      return false;
    } else {
      // Development / test fallback warning
      console.warn(`[NOTIFICATION_SKIPPED] Type: ${type} | Ref: ${refNo}`);
      return true;
    }
  }

  try {
    const { subject, text, html } = renderEmail(type, input);
    const mailFrom = process.env.MAIL_FROM || 'SIT Scholarships <scholarships@sit.ac.in>';

    await smtpClient.sendMail({
      from: mailFrom,
      to,
      subject,
      text,
      html,
    });

    console.log(`[NOTIFICATION_SENT] Type: ${type} | Ref: ${refNo}`);
    return true;
  } catch {
    // Sanitize log: log event type and ref number only, never log error message which could leak PII or server paths
    console.error(`[NOTIFICATION_ERROR] Type: ${type} | Ref: ${refNo}`);
    return false;
  }
}
