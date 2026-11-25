/**
 * WhatsApp / SMS delivery abstraction.
 *
 * Providers (set MSG_PROVIDER in .env.local):
 *   - "whatsapp"  Meta WhatsApp Business Cloud API (recommended for PK)
 *   - "twilio"    Twilio SMS / WhatsApp Messages API
 *   - unset       dev mode — logs the message and reports "sent (dev)" so the
 *                 whole module (contacts, campaigns, reports) can be tested
 *                 without spending money or touching a provider.
 *
 * Bulk sends are concurrency-limited (not fire-and-forget parallel) so we
 * don't hammer the provider and each recipient gets an accurate status.
 */

import { normalizePhone } from "./phone";

export type MessageStatus = "queued" | "sent" | "failed";

export interface MessageResult {
  phone: string;
  status: MessageStatus;
  messageId?: string;
  provider: string;
  error?: string;
}

interface ProviderEnvelope {
  to: string;
  text: string;
}

export { normalizePhone };

async function sendWhatsApp(
  envelope: ProviderEnvelope,
  message?: Record<string, unknown>,
): Promise<MessageResult> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneId || !token) {
    return {
      phone: envelope.to,
      status: "failed",
      provider: "whatsapp",
      error: "WhatsApp credentials not configured (WHATSAPP_PHONE_ID / WHATSAPP_TOKEN).",
    };
  }

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: envelope.to.replace("+", ""),
        ...(message ?? { type: "text", text: { body: envelope.text } }),
      }),
    }
  );
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      phone: envelope.to,
      status: "failed",
      provider: "whatsapp",
      error: json?.error?.message ?? `WhatsApp API ${res.status}`,
    };
  }
  return {
    phone: envelope.to,
    status: "sent",
    provider: "whatsapp",
    messageId: String(json?.messages?.[0]?.id ?? ""),
  };
}

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TOKEN);
}

/** WhatsApp Cloud API only, whatever MSG_PROVIDER says: the confirm flow needs replies via webhook. */
export function sendWhatsAppText(phone: string, text: string): Promise<MessageResult> {
  return sendWhatsApp({ to: phone, text });
}

/**
 * Business-initiated messages need an approved template. Body variables, in order:
 * {{1}} customer name, {{2}} order id, {{3}} total. Without WHATSAPP_CONFIRM_TEMPLATE the
 * plain text is sent, which WhatsApp only delivers inside a customer-initiated 24h window.
 */
export function sendWhatsAppOrderConfirmRequest(
  phone: string,
  vars: { name: string; orderId: string; total: string; text: string },
): Promise<MessageResult> {
  const template = process.env.WHATSAPP_CONFIRM_TEMPLATE?.trim();
  if (!template) return sendWhatsApp({ to: phone, text: vars.text });
  return sendWhatsApp(
    { to: phone, text: vars.text },
    {
      type: "template",
      template: {
        name: template,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "en" },
        components: [
          {
            type: "body",
            parameters: [vars.name, vars.orderId, vars.total].map((text) => ({ type: "text", text })),
          },
        ],
      },
    },
  );
}

async function sendTwilio(envelope: ProviderEnvelope): Promise<MessageResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !auth || !from) {
    return {
      phone: envelope.to,
      status: "failed",
      provider: "twilio",
      error: "Twilio credentials not configured.",
    };
  }

  const body = new URLSearchParams({
    To: envelope.to,
    From: from,
    Body: envelope.text,
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      phone: envelope.to,
      status: "failed",
      provider: "twilio",
      error: json?.message ?? `Twilio API ${res.status}`,
    };
  }
  return {
    phone: envelope.to,
    status: "sent",
    provider: "twilio",
    messageId: String(json?.sid ?? ""),
  };
}

async function sendDev(envelope: ProviderEnvelope): Promise<MessageResult> {
  console.info(`[messaging][dev] would send to ${envelope.to}: ${envelope.text}`);
  return {
    phone: envelope.to,
    status: "sent",
    provider: "dev",
    messageId: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

/** Send one message through the configured provider. */
export async function sendMessage(
  phone: string,
  text: string
): Promise<MessageResult> {
  const provider = (process.env.MSG_PROVIDER || "").toLowerCase();
  if (provider === "whatsapp") return sendWhatsApp({ to: phone, text });
  if (provider === "twilio") return sendTwilio({ to: phone, text });
  return sendDev({ to: phone, text });
}

/**
 * Send the same message to many recipients with limited concurrency so the
 * provider isn't overwhelmed. Returns a result per recipient; failures are
 * captured (not thrown) so a bulk send always produces a full report.
 */
export async function sendBulk(
  recipients: { phone: string; name?: string }[],
  text: string,
  { concurrency = 3 }: { concurrency?: number } = {}
): Promise<MessageResult[]> {
  const results = new Array<MessageResult>(recipients.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= recipients.length) return;
      const recipient = recipients[index];
      const personalized = text.replace(
        /\{name\}/g,
        recipient.name || "valued customer"
      );
      try {
        results[index] = await sendMessage(recipient.phone, personalized);
      } catch (err) {
        results[index] = {
          phone: recipient.phone,
          status: "failed",
          provider: "unknown",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }

  const pool = Array.from({ length: Math.max(1, Math.min(concurrency, 10)) });
  await Promise.all(pool.map(() => worker()));
  return results;
}
