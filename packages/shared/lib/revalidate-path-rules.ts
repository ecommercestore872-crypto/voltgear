/** Paths that invalidate admin-app ISR only (not forwarded to shop). */
export function isAdminCachePath(path: string): boolean {
  return path.startsWith("/admin");
}
