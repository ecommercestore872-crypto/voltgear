/** Static security checks for CI (RLS migrations, public env keys, shop API guards). */

export const PUBLIC_NEXT_ENV_ALLOWLIST = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  "NEXT_PUBLIC_SANITY_DATASET",
  "NEXT_PUBLIC_SANITY_API_VERSION",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "NEXT_PUBLIC_CLARITY_ID",
  "NEXT_PUBLIC_TIKTOK_PIXEL_ID",
  "NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED",
  "NEXT_PUBLIC_ADSENSE_PUB_ID",
  "NEXT_PUBLIC_ADSENSE_BLOG_SLOT",
  "NEXT_PUBLIC_META_PIXEL_ID",
] as const;

const FORBIDDEN_PUBLIC_SUBSTRINGS = [
  "SECRET",
  "SERVICE_ROLE",
  "ADMIN_TOKEN",
  "PASSWORD",
  "PRIVATE_KEY",
  "API_KEY",
  "REVALIDATION",
  "CRON",
  "RESEND",
  "WEBHOOK",
] as const;

const TABLE_RE =
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_][a-z0-9_]*)/gi;
const RLS_RE =
  /alter\s+table\s+public\.([a-z_][a-z0-9_]*)\s+enable\s+row\s+level\s+security/gi;

export function parsePublicTablesFromMigrations(sql: string): string[] {
  const names = new Set<string>();
  for (const match of sql.matchAll(TABLE_RE)) {
    if (match[1]) names.add(match[1]);
  }
  return [...names].sort();
}

export function parseRlsEnabledTables(sql: string): Set<string> {
  const names = new Set<string>();
  for (const match of sql.matchAll(RLS_RE)) {
    if (match[1]) names.add(match[1]);
  }
  return names;
}

export function tablesMissingRls(combinedMigrationSql: string): string[] {
  const tables = parsePublicTablesFromMigrations(combinedMigrationSql);
  const rls = parseRlsEnabledTables(combinedMigrationSql);
  return tables.filter((t) => !rls.has(t));
}

export function auditNextPublicEnvKey(key: string): { ok: true } | { ok: false; reason: string } {
  if (!key.startsWith("NEXT_PUBLIC_")) {
    return { ok: false, reason: "Not a NEXT_PUBLIC_ key" };
  }
  const upper = key.toUpperCase();
  for (const bad of FORBIDDEN_PUBLIC_SUBSTRINGS) {
    if (upper.includes(bad)) {
      return { ok: false, reason: `Forbidden substring ${bad} in public env key` };
    }
  }
  if (!(PUBLIC_NEXT_ENV_ALLOWLIST as readonly string[]).includes(key)) {
    return { ok: false, reason: "Key not in PUBLIC_NEXT_ENV_ALLOWLIST — update allowlist deliberately if safe" };
  }
  return { ok: true };
}

export function parseNextPublicKeysFromEnvExample(content: string): string[] {
  const keys: string[] = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^(NEXT_PUBLIC_[A-Z0-9_]+)=/);
    if (m?.[1]) keys.push(m[1]);
  }
  return keys;
}

export function auditEnvExamplePublicKeys(content: string): string[] {
  const violations: string[] = [];
  for (const key of parseNextPublicKeysFromEnvExample(content)) {
    const r = auditNextPublicEnvKey(key);
    if (!r.ok) violations.push(`${key}: ${r.reason}`);
  }
  return violations;
}

/** Shop route.ts files must contain these substrings (auth / abuse). */
export const SHOP_API_SECURITY_MARKERS: Record<string, string[]> = {
  "checkout/route.ts": ["takeCheckoutRateLimit"],
  "contact/route.ts": ["takePublicPostLimit"],
  "revalidate/route.ts": ["isAdminRequest"],
  "flows/route.ts": ["isCronAuthorized"],
  "analytics/event/route.ts": ["createMemoryRateLimiter"],
  "newsletter/route.ts": ["createMemoryRateLimiter"],
  "upload/route.ts": ["createMemoryRateLimiter"],
  "orders/[orderId]/cancel/route.ts": ["takeOrderCancelLimit"],
  "deals/quote/route.ts": ["takeDealQuoteLimit"],
};

export function shopApiMarkerViolations(
  routeRelativePath: string,
  source: string,
): string[] {
  const markers = SHOP_API_SECURITY_MARKERS[routeRelativePath];
  if (!markers) return [];
  return markers.filter((needle) => !source.includes(needle));
}
