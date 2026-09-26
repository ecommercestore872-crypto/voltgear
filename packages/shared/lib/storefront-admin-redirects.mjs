/**
 * Shop `/admin` and `/studio` redirects (T-40). Imported by apps/storefront/next.config.mjs.
 * Same-origin admin (buyntryy.com/admin) uses rewrites — see storefront-admin-routing.mjs.
 */
export { storefrontAdminRedirects } from "./storefront-admin-routing.mjs";

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
