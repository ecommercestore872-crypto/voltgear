import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

const ADMIN_SESSION_CONTEXT = "voltgear-admin-session-v1";
const ADMIN_ACTOR_CONTEXT = "voltgear-admin-actor-v1";
const ACTOR_SESSION_SECONDS = 60 * 60 * 24 * 7;

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

/** Bind an audited action to the Supabase user authenticated at sign-in. */
export function createAdminActorSession(secret: string, userId: string, now = Date.now()): string {
  const expires = Math.floor(now / 1000) + ACTOR_SESSION_SECONDS;
  const payload = `${userId}.${expires}`;
  const signature = bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(`${ADMIN_ACTOR_CONTEXT}:${payload}`)));
  return `${payload}.${signature}`;
}

export function verifyAdminActorSession(secret: string, value: string, now = Date.now()): string | null {
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(\d{10})\.([0-9a-f]{64})$/i.exec(value);
  if (!match || Number(match[2]) <= Math.floor(now / 1000)) return null;
  const payload = `${match[1]}.${match[2]}`;
  const expected = bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(`${ADMIN_ACTOR_CONTEXT}:${payload}`)));
  return sessionTokensEqual(match[3], expected) ? match[1] : null;
}
