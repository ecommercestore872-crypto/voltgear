/** API routes that must stay public (no admin cookie). */
export function isAdminApiPublicPath(pathname: string): boolean {
  const exact = new Set([
    "/api/admin/login",
    "/api/admin/logout",
    "/api/admin/forgot-password",
    "/api/admin/update-password",
    "/api/admin/demo",
    "/api/webhooks/resend",
  ]);
  if (exact.has(pathname)) return true;
  if (pathname.startsWith("/api/admin/quick-action")) return true;
  return false;
}
