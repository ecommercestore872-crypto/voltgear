import { fetchSiteSettings } from "@/lib/db/store";
import { normalizeSettings } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * Public site configuration for client components (cart drawer, checkout).
 * All normalization and fallback logic lives in normalizeSettings() so the
 * storefront has exactly one source of truth. Falls back to the canonical
 * operational defaults (PKR 5,000 free-shipping threshold, Rs 199 shipping
 * fee) when Sanity is not configured.
 */
export async function GET() {
  try {
    const settings = await fetchSiteSettings();
    return Response.json(normalizeSettings(settings));
  } catch {
    return Response.json(normalizeSettings(null));
  }
}
