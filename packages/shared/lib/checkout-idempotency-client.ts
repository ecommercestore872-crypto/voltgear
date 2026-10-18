export const CHECKOUT_IDEMPOTENCY_STORAGE_KEY = "buy_n_try_checkout_idem";

export interface CheckoutIdempotencyCartItem {
  slug: string;
  quantity: number;
  variantKey?: string;
}

export interface CheckoutIdempotencyState {
  fingerprint: string;
  key: string;
}

interface CheckoutIdempotencyStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface GetOrCreateCheckoutIdempotencyInput {
  items: readonly CheckoutIdempotencyCartItem[];
  storage: CheckoutIdempotencyStorage;
  current?: CheckoutIdempotencyState | null;
  createKey?: () => string;
  now?: () => number;
}

export function checkoutCartFingerprint(
  items: readonly CheckoutIdempotencyCartItem[],
): string {
  return JSON.stringify(
    items.map((item) => ({
      slug: item.slug,
      q: item.quantity,
      v: item.variantKey,
    })),
  );
}

function createBrowserCheckoutKey(now: () => number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `co-${now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateCheckoutIdempotency({
  items,
  storage,
  current,
  createKey,
  now = Date.now,
}: GetOrCreateCheckoutIdempotencyInput): CheckoutIdempotencyState {
  const fingerprint = checkoutCartFingerprint(items);
  if (current?.fingerprint === fingerprint) return current;

  let key = "";
  try {
    const storedValue = storage.getItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
    if (storedValue) {
      const stored = JSON.parse(storedValue) as {
        cartFingerprint?: unknown;
        key?: unknown;
      };
      if (
        stored.cartFingerprint === fingerprint &&
        typeof stored.key === "string" &&
        stored.key
      ) {
        key = stored.key;
      }
    }
  } catch {
    // Storage may be blocked or contain stale data; create a fresh in-memory key.
  }

  if (!key) {
    key = createKey?.() ?? createBrowserCheckoutKey(now);
    try {
      storage.setItem(
        CHECKOUT_IDEMPOTENCY_STORAGE_KEY,
        JSON.stringify({ key, cartFingerprint: fingerprint, createdAt: now() }),
      );
    } catch {
      // The request header still carries the in-memory key when storage is unavailable.
    }
  }

  return { fingerprint, key };
}
