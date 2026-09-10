import crypto from "crypto";
import { publicSiteUrl } from "./deploy-rules";

// We use AUTH_SECRET mapping or a safe fallback.
// Vercel deployment with NextAuth usually defines this.
const SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || "fallback-secret-for-dev-only-9a8b7c6d";

/**
 * Generates a signed, time-expiring URL that can be clicked directly from an email.
 */
export function signActionUrl(
  orderId: string,
  action: string,
  expiresInMinutes = 10080 // 7 days by default
): string {
  const exp = Date.now() + expiresInMinutes * 60 * 1000;
  const payload = `${orderId}:${action}:${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  
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
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
