export function adminAssetPrefix(env = process.env) {
  const origin = env.NEXT_PUBLIC_ADMIN_ASSET_ORIGIN?.trim().replace(/\/+$/, "");

  // Preview assets must stay on the preview deployment. Pointing them at the
  // production alias breaks newly generated hashes and nested font files.
  if (env.VERCEL_ENV !== "production" || !origin) return undefined;

  return origin;
}
