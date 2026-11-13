/** A table name is enough for slow-read diagnostics; query parameters may contain customer data. */
export function supabaseRequestLogPath(input: RequestInfo | URL): string {
  try {
    const pathname = new URL(input instanceof Request ? input.url : String(input)).pathname;
    return /^\/rest\/v1\/[a-z][a-z0-9_]*$/.test(pathname) ? pathname : "/other";
  } catch {
    return "/other";
  }
}
