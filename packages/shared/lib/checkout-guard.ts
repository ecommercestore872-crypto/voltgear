import { createMemoryRateLimiter } from "@/lib/memory-rate-limit";

const checkoutIpLimiter = createMemoryRateLimiter({
  limit: 12,
  windowMs: 60_000,
  maxKeys: 8_000,
});

const checkoutEmailLimiter = createMemoryRateLimiter({
  limit: 5,
  windowMs: 60_000,
  maxKeys: 8_000,
});

export function checkoutClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export function takeCheckoutRateLimit(input: {
  ip: string;
  email: string;
}): { ok: true } | { ok: false; error: string } {
  if (!checkoutIpLimiter.take({ ip: input.ip })) {
    return {
      ok: false,
      error: "Too many checkout attempts. Please wait a minute and try again.",
    };
  }
  if (!checkoutEmailLimiter.take({ ip: input.email.toLowerCase() })) {
    return {
      ok: false,
      error: "Too many orders for this email just now. Please wait a minute.",
    };
  }
  return { ok: true };
}

export function readIdempotencyKey(
  request: Request,
  bodyKey?: string,
): string | null {
  const header = request.headers.get("idempotency-key")?.trim();
  if (header && header.length >= 8 && header.length <= 128) return header;
  const raw = typeof bodyKey === "string" ? bodyKey.trim() : "";
  if (raw && raw.length >= 8 && raw.length <= 128) return raw;
  return null;
}
