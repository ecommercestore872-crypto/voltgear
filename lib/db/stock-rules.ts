export type StockDecision = "unlimited" | "decrement" | "insufficient" | "invalid";

export function decideStockAction(
  current: number | null | undefined,
  requested: number
): StockDecision {
  if (!Number.isInteger(requested) || requested < 1) return "invalid";
  if (current == null) return "unlimited";
  if (!Number.isInteger(current) || current < 0) return "invalid";
  if (current < requested) return "insufficient";
  return "decrement";
}

export function nextStockStatus(
  remaining: number,
  lowThreshold = 5
): "in-stock" | "low-stock" | "out-of-stock" {
  if (remaining <= 0) return "out-of-stock";
  if (remaining <= lowThreshold) return "low-stock";
  return "in-stock";
}

export function parseOptionalQuantity(raw: unknown):
  | { ok: true; quantity: number | null }
  | { ok: false; error: string } {
  if (raw === "" || raw == null) return { ok: true, quantity: null };
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isInteger(n) || n < 0) {
    return { ok: false, error: "Units must be a whole number of 0 or more, or left empty." };
  }
  return { ok: true, quantity: n };
}

export function syncStockStatusWithQuantity(
  status: string,
  quantity: number | null
): string {
  if (quantity === 0) return "out-of-stock";
  return status || "in-stock";
}
