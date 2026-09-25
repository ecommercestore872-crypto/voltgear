/**
 * Shop `/admin` and `/studio` redirects (T-40). Imported by apps/storefront/next.config.mjs.
 * @param {Record<string, string | undefined>} env
 * @returns {{ source: string; destination: string; permanent: boolean }[]}
 */
export function storefrontAdminRedirects(env = process.env) {
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
 * @param {string} shopOrigin e.g. https://buyntryy.com
 * @param {string} adminPublicUrl e.g. https://voltgear-admin-dashboard.vercel.app
 * @param {string} path e.g. /admin/login
 */
export function expectedAdminRedirectDestination(
  shopOrigin,
  adminPublicUrl,
  path,
) {
  const base = adminPublicUrl.replace(/\/$/, "");
  if (path === "/studio") return `${base}/admin/login`;
  if (path === "/admin") return `${base}/admin`;
  if (path.startsWith("/admin/")) {
    return `${base}${path}`;
  }
  return null;
}
