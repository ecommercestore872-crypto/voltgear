import { Resend } from "resend";

import {
  envFromAddress,
  resendSendInput,
  resolveEmailBrandName,
  resolveNotifyAddress,
} from "@/lib/email-rules";
import {
  resolvePurposeFromAddress,
  type EmailSendPurpose,
  type EmailSenderConfig,
} from "@/lib/email-sender-rules";
import { isEmailSuppressed } from "@/lib/db/email-suppression-store";
import { fetchSiteSettings } from "@/lib/db/store";

export const EMAIL_BRAND_NAME = resolveEmailBrandName(process.env.BRAND_NAME);

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  bcc?: string[];
  replyTo?: string;
}

export function resolveNotificationEmail(
  settingsEmail?: string | null,
  customerEmail?: string | null,
): string {
  return resolveNotifyAddress({
    envNotify: process.env.ORDER_NOTIFY_EMAIL,
    settingsEmail,
    customerEmail,
  });
}

async function loadEmailSenders(): Promise<EmailSenderConfig | undefined> {
  try {
    const settings = await fetchSiteSettings();
    const config = settings?.emailSenders;
    if (!config || Object.keys(config).length === 0) return undefined;
    return config;
  } catch {
    return undefined;
  }
}

export async function deliverEmail(
  message: EmailMessage,
  purpose: EmailSendPurpose,
): Promise<boolean> {
  if (await isEmailSuppressed(message.to)) {
    console.info(
      "[email]",
      JSON.stringify({
        outcome: "skipped_suppressed",
        purpose,
        ts: new Date().toISOString(),
      }),
    );
    return false;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const replyTo = resolveNotificationEmail() || message.replyTo;
  const senders = await loadEmailSenders();
  const payload = resendSendInput({
    from: resolvePurposeFromAddress({
      purpose,
      senders,
      envFrom: envFromAddress(),
      brand: EMAIL_BRAND_NAME,
    }),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    bcc: message.bcc,
    replyTo,
    headers: {
      "X-Entity-Ref-ID": `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      "List-Unsubscribe": `<mailto:unsubscribe@${EMAIL_BRAND_NAME.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}.com?subject=unsubscribe>`,
    },
  });

  if (!apiKey) {
    console.info(
      "[email][dev] would send:",
      JSON.stringify(
        { ...message, replyTo, from: payload.from },
        null,
        2,
      ),
    );
    return true;
  }

  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send(payload);
    if (error) {
      const detail = typeof error.message === "string" ? error.message : "";
      console.error(
        "[email]",
        JSON.stringify({
          outcome: "send_failed",
          purpose,
          message: detail || "unknown",
          ts: new Date().toISOString(),
        }),
      );
      if (/domain is not verified/i.test(detail)) {
        console.error(
          "[email] Verify the From domain at https://resend.com/domains then set FROM_EMAIL to an address on that domain.",
        );
      }
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] send failed:", error);
    return false;
  }
}
