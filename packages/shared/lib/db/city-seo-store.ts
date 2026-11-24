import { unstable_cache } from "next/cache";

import { db } from "@/lib/db/store-query-foundation";
import { citySeoHubSlugs } from "@/lib/city-seo";
import { cleanText } from "@/lib/onpage-seo";
import { STOREFRONT_SHOP_TYPES_CACHE_TAG } from "@/lib/storefront-cache";
import { getServiceClient } from "@/lib/supabase/server";
import { revalidateShopMerchandising } from "@/lib/revalidate-storefront";

/** Admin-written unique intro per city, keyed by slug. Missing = no override. */
export const fetchCityIntros = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const { data, error } = await db().from("city_seo").select("slug, intro");
    if (error) return {};
    const out: Record<string, string> = {};
    for (const row of data ?? []) {
      const intro = cleanText(row.intro);
      if (intro) out[String(row.slug)] = intro;
    }
    return out;
  },
  ["city-intros-v1"],
  { revalidate: 3600, tags: [STOREFRONT_SHOP_TYPES_CACHE_TAG] },
);

export async function saveCityIntros(
  intros: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const allowed = new Set(citySeoHubSlugs());
  const rows = Object.entries(intros)
    .filter(([slug]) => allowed.has(slug))
    .map(([slug, intro]) => ({ slug, intro: cleanText(intro) ?? null, updated_at: new Date().toISOString() }));
  if (!rows.length) return { ok: true };
  const { error } = await getServiceClient({ admin: true }).from("city_seo").upsert(rows, { onConflict: "slug" });
  if (error) return { ok: false, error: error.message };
  await revalidateShopMerchandising(...rows.map((r) => `/cod/${r.slug}`));
  return { ok: true };
}
