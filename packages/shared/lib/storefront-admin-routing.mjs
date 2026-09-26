/**
 * Shop admin routing (T-40): external redirect vs same-origin proxy.
 * Imported by apps/storefront/next.config.mjs.
 */

export function normalizeOrigin(url) {
  return (url ?? "").replace(/\/$/, "");
}

/**
 * Admin UI and APIs stay on buyntryy.com when ADMIN_PROXY_UPSTREAM is set
 * and ADMIN_PUBLIC_URL matches the shop origin (or ADMIN_SAME_ORIGIN=1).
 */
export function isAdminSameOriginMode(env = process.env) {
  const upstream = normalizeOrigin(env.ADMIN_PROXY_UPSTREAM);
  if (!upstream) return false;
  if (env.ADMIN_SAME_ORIGIN === "1" || env.ADMIN_SAME_ORIGIN === "true") {
    return true;
  }
  const shop = normalizeOrigin(
    env.NEXT_PUBLIC_SITE_URL ||
      (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : ""),
  );
  const adminPublic = normalizeOrigin(env.ADMIN_PUBLIC_URL);
  return Boolean(shop && adminPublic && shop === adminPublic);
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {{ source: string; destination: string; permanent: boolean }[]}
 */
export function storefrontAdminRedirects(env = process.env) {
  if (isAdminSameOriginMode(env)) return [];

  const adminBase =
    env.ADMIN_PUBLIC_URL?.replace(/\/$/, "") ||
    (env.NODE_ENV !== "production" ? "http://localhost:3001" : "");
  if (!adminBase) return [];
  return [
    { source: "/admin", destination: `${adminBase}/admin`, permanent: false },
    {
      source: "/admin/:path*",
      destination: `${adminBase}/admin/:path*`,
      permanent: false,
    },
    {
      source: "/studio",
      destination: `${adminBase}/admin/login`,
      permanent: false,
    },
  ];
}

/**
 * Proxy admin app from a separate Vercel project; browser URL stays on the shop domain.
 * @param {Record<string, string | undefined>} env
 * @returns {{ source: string; destination: string }[]}
 */
export function storefrontAdminRewrites(env = process.env) {
  if (!isAdminSameOriginMode(env)) return [];

  const upstream = normalizeOrigin(env.ADMIN_PROXY_UPSTREAM);
  if (!upstream) return [];

  return [
    { source: "/studio", destination: `${upstream}/admin/login` },
    { source: "/admin", destination: `${upstream}/admin` },
    { source: "/admin/:path*", destination: `${upstream}/admin/:path*` },
    {
      source: "/api/admin/:path*",
      destination: `${upstream}/api/admin/:path*`,
    },
    {
      source: "/api/messaging/:path*",
      destination: `${upstream}/api/messaging/:path*`,
    },
    {
      source: "/api/webhooks/resend",
      destination: `${upstream}/api/webhooks/resend`,
    },
    { source: "/api/indexnow", destination: `${upstream}/api/indexnow` },
  ];
}
