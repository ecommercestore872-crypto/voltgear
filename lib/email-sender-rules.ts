import { resolveFromAddress } from "./email-rules";

export const EMAIL_SEND_PURPOSES = [
  {
    kind: "orderConfirmation",
    label: "Order confirmation",
    hint: "Sent to the customer after checkout.",
  },
  {
    kind: "ownerNewOrder",
    label: "New-order alert",
    hint: "Sent to you when a customer places an order.",
  },
  {
    kind: "orderStatus",
    label: "Status updates",
    hint: "Processing, shipped, delivered, and cancelled.",
  },
  {
    kind: "abandonedCart",
    label: "Abandoned cart",
    hint: "Reminder when someone leaves checkout.",
  },
  {
    kind: "reviewRequest",
    label: "Review request",
    hint: "Ask for a review a few days after the order.",
  },
  {
    kind: "winback",
    label: "Win-back",
    hint: "Customers who have not ordered in a while.",
  },
  {
    kind: "marketing",
    label: "Marketing",
    hint: "Messaging compose in admin.",
  },
] as const;

export type EmailSendPurpose = (typeof EMAIL_SEND_PURPOSES)[number]["kind"];

export type EmailSenderConfig = Partial<Record<EmailSendPurpose, string>>;

const PURPOSE_KINDS = new Set<string>(EMAIL_SEND_PURPOSES.map((p) => p.kind));

const BARE_EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const NAMED_EMAIL = /^.+\s<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/;

export function senderFieldError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (BARE_EMAIL.test(value) || NAMED_EMAIL.test(value)) return null;
  return "Enter a valid email, like noreply@mail.buyntryy.com";
}

export function parseEmailSenderConfig(raw: unknown): EmailSenderConfig {
  if (!raw || typeof raw !== "object") return {};
  const rec = raw as Record<string, unknown>;
  const out: EmailSenderConfig = {};
  for (const kind of PURPOSE_KINDS) {
    const value = rec[kind];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || senderFieldError(trimmed)) continue;
    out[kind as EmailSendPurpose] = trimmed;
  }
  return out;
}

export function formatSenderFrom(mailbox: string, brand: string): string {
  const value = mailbox.trim();
  if (NAMED_EMAIL.test(value)) return value;
  const name = brand.trim() || "Buy n Try";
  return `${name} <${value}>`;
}

export function resolvePurposeFromAddress(input: {
  purpose: EmailSendPurpose;
  senders?: EmailSenderConfig | null;
  envFrom?: string | null;
  brand?: string;
}): string {
  const purposeMailbox = input.senders?.[input.purpose]?.trim();
  if (purposeMailbox) {
    return formatSenderFrom(purposeMailbox, input.brand || "Buy n Try");
  }
  return resolveFromAddress({ envFrom: input.envFrom, brand: input.brand });
}

export function emailSenderDocError(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  for (const purpose of EMAIL_SEND_PURPOSES) {
    const value = rec[purpose.kind];
    if (typeof value !== "string") continue;
    const err = senderFieldError(value);
    if (err) return `${purpose.label}: ${err}`;
  }
  return null;
}
