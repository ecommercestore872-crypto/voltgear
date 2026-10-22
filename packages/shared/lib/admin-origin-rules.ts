/** Allow exact origins only; forwarding headers cannot expand browser trust. */
export function isTrustedAdminMutationOrigin(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  if (origin === new URL(request.url).origin) return true;

  // The supported storefront rewrite keeps the shop's browser Origin while
  // Next receives an upstream admin-host URL. Use server configuration, never
  // client-controlled X-Forwarded-Host, to authorize that public entry point.
  const proxyMode = env.ADMIN_SAME_ORIGIN === "1" || env.ADMIN_SAME_ORIGIN === "true";
  const publicUrl = env.ADMIN_PUBLIC_URL || (proxyMode ? env.NEXT_PUBLIC_SITE_URL : undefined);
  if (!publicUrl) return false;
  try {
    const configured = new URL(publicUrl);
    return !configured.username && !configured.password &&
      ["http:", "https:"].includes(configured.protocol) && configured.origin === origin;
  } catch {
    return false;
  }
}
