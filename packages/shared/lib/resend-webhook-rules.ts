import { createHmac, timingSafeEqual } from "node:crypto";

export type ResendWebhookKind = "email.bounced" | "email.complained";

export type ParsedResendWebhook = {
  kind: ResendWebhookKind;
  emails: string[];
};

const SUPPRESSION_EVENTS: ResendWebhookKind[] = [
  "email.bounced",
  "email.complained",
];

export function normalizeEmailForSuppression(raw: string): string {
  return raw.trim().toLowerCase();
}

export function parseResendWebhookPayload(body: unknown): ParsedResendWebhook | null {
  if (!body || typeof body !== "object") return null;
  const type = (body as { type?: unknown }).type;
  if (typeof type !== "string" || !SUPPRESSION_EVENTS.includes(type as ResendWebhookKind)) {
    return null;
  }
  const data = (body as { data?: unknown }).data;
  const emails = extractRecipientEmails(data);
  if (!emails.length) return null;
  return { kind: type as ResendWebhookKind, emails };
}

function extractRecipientEmails(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const row = data as { to?: unknown; email?: unknown };
  const out: string[] = [];
  if (Array.isArray(row.to)) {
    for (const e of row.to) {
      if (typeof e === "string" && e.includes("@")) {
        out.push(normalizeEmailForSuppression(e));
      }
    }
  }
  if (typeof row.email === "string" && row.email.includes("@")) {
    out.push(normalizeEmailForSuppression(row.email));
  }
  return [...new Set(out)];
}

export function suppressionReasonFromResendKind(
  kind: ResendWebhookKind,
): "bounce" | "complaint" {
  return kind === "email.complained" ? "complaint" : "bounce";
}

/** Svix-signed webhooks (Resend). Secret from Resend dashboard (`whsec_…`). */
export function verifySvixWebhookSignature(input: {
  rawBody: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
  secret: string;
  nowSec?: number;
}): boolean {
  const { rawBody, svixId, svixTimestamp, svixSignature, secret } = input;
  if (!svixId?.trim() || !svixTimestamp?.trim() || !svixSignature?.trim() || !secret.trim()) {
    return false;
  }
  const ts = Number.parseInt(svixTimestamp, 10);
  if (!Number.isFinite(ts)) return false;
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) return false;

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const key = decodeSvixSecret(secret.trim());
  const expected = createHmac("sha256", key).update(signedContent).digest("base64");

  for (const part of svixSignature.split(" ")) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      /* next signature */
    }
  }
  return false;
}

function decodeSvixSecret(secret: string): Buffer {
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  return Buffer.from(raw, "base64");
}
