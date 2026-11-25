/** API routes that must stay public (no admin cookie). */
export function isAdminApiPublicPath(pathname: string): boolean {
  const exact = new Set([
    "/api/admin/login",
    "/api/admin/forgot-password",
    "/api/admin/quick-action",
    "/api/webhooks/resend",
    "/api/webhooks/whatsapp",
  ]);
  return exact.has(pathname);
}
