import { createMemoryRateLimiter } from "@/lib/memory-rate-limit";
import { checkoutClientIp } from "@/lib/checkout-guard";

const contactLimiter = createMemoryRateLimiter({
  limit: 8,
  windowMs: 60_000,
  maxKeys: 8_000,
});

const abandonedLimiter = createMemoryRateLimiter({
  limit: 10,
  windowMs: 60_000,
  maxKeys: 8_000,
});

const reviewLimiter = createMemoryRateLimiter({
  limit: 6,
  windowMs: 60_000,
  maxKeys: 8_000,
});

const promoLimiter = createMemoryRateLimiter({
  limit: 20,
  windowMs: 60_000,
  maxKeys: 8_000,
});

const orderCancelLimiter = createMemoryRateLimiter({
  limit: 12,
  windowMs: 60_000,
  maxKeys: 8_000,
});

const dealQuoteLimiter = createMemoryRateLimiter({
  limit: 40,
  windowMs: 60_000,
  maxKeys: 8_000,
});

export function takePublicPostLimit(
  request: Request,
  kind: "contact" | "abandoned" | "review" | "promo"
): { ok: true } | { ok: false; error: string; status: 429 } {
  const ip = checkoutClientIp(request);
  const limiter =
    kind === "contact"
      ? contactLimiter
      : kind === "abandoned"
        ? abandonedLimiter
        : kind === "promo"
          ? promoLimiter
          : reviewLimiter;
  if (!limiter.take({ ip })) {
    return {
      ok: false,
      status: 429,
      error: "Too many requests. Please wait a minute and try again.",
    };
  }
  return { ok: true };
}

function takeIpLimit(
  request: Request,
  limiter: ReturnType<typeof createMemoryRateLimiter>,
): { ok: true } | { ok: false; error: string; status: 429 } {
  const ip = checkoutClientIp(request);
  if (!limiter.take({ ip })) {
    return {
      ok: false,
      status: 429,
      error: "Too many requests. Please wait a minute and try again.",
    };
  }
  return { ok: true };
}

export function takeOrderCancelLimit(
  request: Request,
): { ok: true } | { ok: false; error: string; status: 429 } {
  return takeIpLimit(request, orderCancelLimiter);
}

export function takeDealQuoteLimit(
  request: Request,
): { ok: true } | { ok: false; error: string; status: 429 } {
  return takeIpLimit(request, dealQuoteLimiter);
}
