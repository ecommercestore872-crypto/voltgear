import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

const ADMIN_SESSION_CONTEXT = "voltgear-admin-session-v1";
export const ADMIN_ACTOR_COOKIE = "vg_admin_actor";
const ADMIN_ACTOR_CONTEXT = "voltgear-admin-actor-v1:";

export function signedAdminActor(userId: string, secret: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(userId)) throw new Error("Invalid admin actor");
  const digest = bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(ADMIN_ACTOR_CONTEXT + userId)));
  return `${userId}.${digest}`;
}

export function verifiedAdminActor(value: string, secret: string): string | null {
  const match = /^([0-9a-f]{8}-[0-9a-f-]{27,36})\.([0-9a-f]{64})$/i.exec(value);
  if (!match) return null;
  return sessionTokensEqual(value, signedAdminActor(match[1], secret)) ? match[1] : null;
}

/**
 * Derive the browser-session credential without exposing the master admin token.
 * Web Crypto keeps this helper compatible with both Next.js middleware and Node routes.
 */
export function deriveAdminSessionToken(secret: string): string {
  return bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(ADMIN_SESSION_CONTEXT)));
}

/** Constant-work comparison for the fixed-length session digest used at the edge. */
export function sessionTokensEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}
