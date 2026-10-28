import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60;

/** A random per-login credential. No shared integration secret enters this cookie. */
export function createAdminSessionToken(): string {
  return `v2.${bytesToHex(crypto.getRandomValues(new Uint8Array(32)))}`;
}

export function isAdminSessionToken(token: string): boolean {
  return /^v2\.[a-f0-9]{64}$/.test(token);
}

export function hashAdminSessionToken(token: string): string {
  return bytesToHex(sha256(utf8ToBytes(token)));
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
