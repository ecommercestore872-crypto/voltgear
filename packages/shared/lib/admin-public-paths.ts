/** Admin routes that must work without an existing session (middleware + shell chrome). */
export function isAdminPublicPath(pathname: string): boolean {
  const publicPrefixes = [
    "/admin/login",
    "/admin/forgot-password",
    "/admin/reset-password",
  ];
  return publicPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}