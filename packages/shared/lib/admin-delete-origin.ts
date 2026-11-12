type Env = Record<string, string | undefined>;

/** Only complete, explicitly configured origins can authorize a browser mutation. */
function configuredOrigin(value: string | undefined, allowLocalHttp: boolean): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol === "https:") return url.origin;
    if (allowLocalHttp && url.protocol === "http:" && url.hostname === "localhost") return url.origin;
  } catch {
    // Invalid deployment configuration must fail closed.
  }
  return null;
}

function vercelDeploymentOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(`https://${value.trim()}`);
    if (!url.username && !url.password && url.hostname.endsWith(".vercel.app") &&
        !url.port && url.pathname === "/" && !url.search && !url.hash) {
      return url.origin;
    }
  } catch {
    // Invalid deployment configuration must fail closed.
  }
  return null;
}

export function isAllowedAdminDeleteOrigin(origin: string | null, env: Env = process.env): boolean {
  if (!origin) return false;
  const localDevelopment = env.NODE_ENV === "development" && !env.VERCEL_ENV;
  const trusted = [
    configuredOrigin(env.NEXT_PUBLIC_SITE_URL, localDevelopment),
    configuredOrigin(env.NEXT_PUBLIC_ADMIN_ASSET_ORIGIN, localDevelopment),
    vercelDeploymentOrigin(env.VERCEL_URL),
    ...(localDevelopment ? ["http://localhost:3001"] : []),
  ];
  return trusted.includes(origin);
}
