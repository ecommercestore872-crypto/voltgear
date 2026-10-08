const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ITEMS = 20;

export function normalizeAbandonedCart(input: unknown):
  | {
      ok: true;
      value: {
        email: string;
        name: string;
        items: { name: string; price: number; quantity: number }[];
        subtotal: number;
      };
    }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Nothing to track." };
  }
  const body = input as Record<string, unknown>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim().slice(0, 100);
  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return { ok: false, error: "Nothing to track." };
  }

  const items = body.items.slice(0, MAX_ITEMS).map((item) => {
    const row = item && typeof item === "object"
      ? (item as Record<string, unknown>)
      : {};
    return {
      name: String(row.name ?? "").trim().slice(0, 200),
      price: Number(row.price),
      quantity: Number(row.quantity),
    };
  });
  if (
    items.some(
      (item) =>
        !item.name ||
        !Number.isFinite(item.price) ||
        item.price < 0 ||
        item.price > 10_000_000 ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 20,
    )
  ) {
    return { ok: false, error: "Cart details are invalid." };
  }

  const subtotal = Math.round(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100,
  ) / 100;
  return { ok: true, value: { email, name, items, subtotal } };
}
