/**
 * First-party visitor ID used as Meta `external_id`. The browser pixel and the
 * server (Conversions API) read the same cookie, so Meta can tie both copies of
 * an event to one visitor. It is random, carries no personal data, and is only
 * created after advertising consent.
 */
export const META_EXTERNAL_ID_COOKIE = "bnt_xid";
const EXTERNAL_ID = /^[A-Za-z0-9_-]{16,64}$/;

export function validMetaExternalId(value: unknown): value is string {
  return typeof value === "string" && EXTERNAL_ID.test(value);
}

export function readMetaExternalIdFromCookieHeader(cookieHeader: string): string | undefined {
  const value = cookieHeader.match(/(?:^|;\s*)bnt_xid=([^;]+)/)?.[1];
  return validMetaExternalId(value) ? value : undefined;
}

/** Random event ID shared by the browser pixel call and its server copy. */
export function newMetaEventId(): string {
  const c = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Browser only. Call after advertising consent is confirmed. */
export function ensureMetaExternalId(): string | undefined {
  if (typeof document === "undefined") return undefined;
  try {
    const existing = readMetaExternalIdFromCookieHeader(document.cookie);
    if (existing) return existing;
    const id = newMetaEventId().replace(/-/g, "");
    document.cookie = `${META_EXTERNAL_ID_COOKIE}=${id}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    return id;
  } catch {
    return undefined;
  }
}
