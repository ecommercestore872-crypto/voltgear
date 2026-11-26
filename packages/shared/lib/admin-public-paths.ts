/** Admin routes that must work without an existing session (middleware + shell chrome). */
export function isAdminPublicPath(pathname: string): boolean {
  const publicPrefixes = [
    "/admin/login",
    "/admin/forgot-password",
    "/admin/reset-password",
    "/admin/manifest.webmanifest", // manifest and home-screen icons are fetched without cookies
    "/admin/sw.js", // push service worker is fetched by the browser without cookies
    "/admin/icons",
  ];
  return publicPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}