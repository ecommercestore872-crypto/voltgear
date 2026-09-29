/**
 * Point Supabase category rows at first-party /categories/*.webp assets.
 * Run: npx tsx scripts/sync-category-webp-urls.ts
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";

import { FALLBACK_SHOP_TYPES } from "../packages/shared/lib/categories";

loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  for (const type of FALLBACK_SHOP_TYPES) {
    if (!type.imageUrl) continue;
    const { error, count } = await supabase
      .from("categories")
      .update({ image_url: type.imageUrl })
      .eq("slug", type.slug)
      .or("image_url.is.null,image_url.ilike.%/categories/%.png");
    if (error) {
      console.error(type.slug, error.message);
      continue;
    }
    console.log(type.slug, "→", type.imageUrl, count != null ? "" : "");
  }
  console.log("Done. Revalidate shop cache or wait ~60s for fetchShopTypes.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
