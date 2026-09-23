import { normalizePhone } from "@/lib/messaging";

/** Build a wa.me URL from a configured number, or null if unusable. */
export function whatsappHref(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const e164 = normalizePhone(raw);
  if (e164) return `https://wa.me/${e164.replace("+", "")}`;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}`;
}

/** Shop chat: Settings WhatsApp first, then the contact phone. */
export function shopWhatsAppHref(settings: {
  whatsappNumber?: string | null;
  phone?: string | null;
} | null | undefined): string | null {
  return whatsappHref(settings?.whatsappNumber || settings?.phone);
}

export function telHref(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const compact = raw.replace(/[^\d+]/g, "");
  if (compact.replace(/\D/g, "").length < 7) return null;
  return `tel:${compact}`;
}
