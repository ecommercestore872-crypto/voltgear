import crypto from "crypto";
import { publicSiteUrl } from "./deploy-rules";
import type { OrderStatus } from "./types";

type Env = Record<string, string | undefined>;

export function resolveActionSecret(env: Env = process.env): string {
  const secret = (env.AUTH_SECRET || env.JWT_SECRET || env.ADMIN_TOKEN || "").trim();
  if (secret) return secret;
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    throw new Error("AUTH_SECRET (or ADMIN_TOKEN) is required for signed admin actions.");
  }
  return "fallback-secret-for-dev-only-9a8b7c6d";
}

export const QUICK_ACTION_STATUSES = ["shipped", "cancelled"] as const satisfies readonly OrderStatus[];

export function isQuickActionStatus(value: string): value is (typeof QUICK_ACTION_STATUSES)[number] {
  return (QUICK_ACTION_STATUSES as readonly string[]).includes(value);
}

/**
 * Generates a signed, time-expiring URL that can be clicked directly from an email.
 */
export function signActionUrl(
  orderId: string,
  action: (typeof QUICK_ACTION_STATUSES)[number],
  expiresInMinutes = 10080 // 7 days by default
): string {
  const exp = Date.now() + expiresInMinutes * 60 * 1000;
  const payload = `${orderId}:${action}:${exp}`;
  const sig = crypto.createHmac("sha256", resolveActionSecret()).update(payload).digest("hex");
  
  const baseUrl = publicSiteUrl();
  return `${baseUrl}/api/admin/quick-action?orderId=${encodeURIComponent(orderId)}&action=${encodeURIComponent(action)}&exp=${exp}&sig=${sig}`;
}

/**
 * Confirms cryptographic integrity of the incoming URL.
 */
export function verifyAction(sig: string, orderId: string, action: string, expStr: string): boolean {
  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || Date.now() > exp) return false;
  
  const payload = `${orderId}:${action}:${exp}`;
  const expected = crypto.createHmac("sha256", resolveActionSecret()).update(payload).digest("hex");
  
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
