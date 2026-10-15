import { normalizeNewsletterEmail } from "@/lib/newsletter-rules";
import type { OrderItem } from "@/lib/types";

export function validateAbandonedCart(input: unknown):
  | {
      ok: true;
      data: { email: string; name: string; items: OrderItem[]; subtotal: number };
    }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Nothing to track." };
  }
  const row = input as Record<string, unknown>;
  const email = normalizeNewsletterEmail(row.email);
  if (!email.ok || !Array.isArray(row.items) || row.items.length < 1 || row.items.length > 20) {
    return { ok: false, error: "Nothing to track." };
  }
  const items: OrderItem[] = [];
  let subtotal = 0;
  for (const raw of row.items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: "Invalid cart." };
    }
    const item = raw as Record<string, unknown>;
    const name = String(item.name ?? "").trim();
    const price = Number(item.price);
    const quantity = Number(item.quantity);
    if (
      !name ||
      name.length > 200 ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 1_000_000 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      return { ok: false, error: "Invalid cart." };
    }
    const lineTotal = Math.round(price * quantity * 100) / 100;
    subtotal = Math.round((subtotal + lineTotal) * 100) / 100;
    items.push({ name, price, quantity });
  }
  return {
    ok: true,
    data: {
      email: email.email,
      name: String(row.name ?? "").trim().slice(0, 120),
      items,
      subtotal,
    },
  };
}
