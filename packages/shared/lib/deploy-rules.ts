type Env = Record<string, string | undefined>;

export function publicSiteUrl(env: Env = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit && !/^https?:\/\/localhost\b/i.test(explicit)) return explicit;
  const vercel =
    env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || env.VERCEL_URL?.trim();
  if (vercel) return vercel.startsWith("http") ? vercel.replace(/\/+$/, "") : `https://${vercel}`;
  if (explicit) return explicit;
  return "http://localhost:3000";
}

export function resolveAdminSecret(env: Env = process.env): string {
  const secret = (env.ADMIN_TOKEN || env.REVALIDATION_TOKEN || "").trim();
  if (secret) return secret;
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    throw new Error("ADMIN_TOKEN is required in production.");
  }
  return "voltgear-demo-revalidate";
}

export function isCronAuthorized(
  authorization: string | null | undefined,
  env: Env = process.env
): boolean {
  const secret = (env.CRON_SECRET || "").trim();
  const production = env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
  if (!production && !secret) return true;
  if (!secret) return false;
  const provided = (authorization || "").replace(/^Bearer\s+/i, "").trim();
  return Boolean(provided) && provided === secret;
}
