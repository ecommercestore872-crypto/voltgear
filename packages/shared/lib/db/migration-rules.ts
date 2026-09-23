export function assertCatalogNotEmpty(productCount: number): void {
  if (productCount <= 0) {
    throw new Error("Catalog is empty after copy. Do not switch. Fix and retry.");
  }
}

export function isSanityCdnUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname === "cdn.sanity.io";
  } catch {
    return url.includes("cdn.sanity.io");
  }
}

export function assertNoSanityCdnUrls(urls: Array<string | null | undefined>): void {
  const leftover = urls.filter((u): u is string => Boolean(u) && isSanityCdnUrl(u));
  if (leftover.length) {
    throw new Error(
      `Cutover blocked: ${leftover.length} image URL(s) still on cdn.sanity.io`
    );
  }
}

export function isCloudinaryConfigured(parts: {
  cloudName?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
}): boolean {
  return Boolean(parts.cloudName && parts.apiKey && parts.apiSecret);
}

export function chooseImageBackend(
  cloudinaryReady: boolean
): "cloudinary" | "supabase" {
  return cloudinaryReady ? "cloudinary" : "supabase";
}

export function readSupabaseEnv(parts: {
  url?: string | null;
  anonKey?: string | null;
  serviceRoleKey?: string | null;
}): { url: string; anonKey: string; serviceRoleKey: string } {
  const url = parts.url?.trim() || "";
  const anonKey = parts.anonKey?.trim() || "";
  const serviceRoleKey = parts.serviceRoleKey?.trim() || "";
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
  return { url, anonKey, serviceRoleKey };
}

export function shouldBlockSecondCheckout(state: {
  inFlight: boolean;
  alreadyPlaced: boolean;
}): boolean {
  return state.inFlight || state.alreadyPlaced;
}
