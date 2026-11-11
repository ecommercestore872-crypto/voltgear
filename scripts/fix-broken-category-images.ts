/**
 * Beast Mode: Inspect and update all Supabase category rows to verified first-party /categories/*.webp assets.
 * Run: npx tsx scripts/fix-broken-category-images.ts
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import { FALLBACK_SHOP_TYPES } from "../packages/shared/lib/categories";

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function main() {
  console.log("=== STEP 1: INSPECT CURRENT SUPABASE CATEGORIES ===");
  const { data: existing, error: fetchErr } = await supabase
    .from("categories")
    .select("id, name, slug, image_url, sort_order, active")
    .order("sort_order", { ascending: true });

  if (fetchErr) {
    console.error("Failed to query categories:", fetchErr);
    process.exit(1);
  }

  console.log(`Found ${existing?.length || 0} categories in database:`);
  for (const cat of existing || []) {
    console.log(` - [${cat.slug}] "${cat.name}": image_url = ${cat.image_url || "<null>"}`);
  }

  console.log("\n=== STEP 2: FIXING CATEGORY IMAGE URLS ===");
  let updatedCount = 0;
  for (const fallback of FALLBACK_SHOP_TYPES) {
    if (!fallback.imageUrl) continue;

    const matched = existing?.find((c) => c.slug === fallback.slug);
    if (!matched) {
      console.log(`Category [${fallback.slug}] does not exist in DB yet, inserting...`);
      const { error: insertErr } = await supabase.from("categories").insert({
        name: fallback.name,
        slug: fallback.slug,
        description: fallback.description,
        image_url: fallback.imageUrl,
        sort_order: fallback.sortOrder,
        active: true,
      });
      if (insertErr) {
        console.error(`Error inserting ${fallback.slug}:`, insertErr.message);
      } else {
        console.log(`Inserted [${fallback.slug}] with ${fallback.imageUrl}`);
        updatedCount++;
      }
      continue;
    }

    if (matched.image_url !== fallback.imageUrl) {
      console.log(`Updating [${fallback.slug}]:\n   FROM: ${matched.image_url}\n     TO: ${fallback.imageUrl}`);
      const { error: updateErr } = await supabase
        .from("categories")
        .update({ image_url: fallback.imageUrl })
        .eq("slug", fallback.slug);

      if (updateErr) {
        console.error(`Error updating ${fallback.slug}:`, updateErr.message);
      } else {
        updatedCount++;
      }
    } else {
      console.log(`[${fallback.slug}] already up to date: ${fallback.imageUrl}`);
    }
  }

  console.log(`\nUpdated ${updatedCount} categories.`);

  console.log("\n=== STEP 3: VERIFY FINAL DATABASE STATE ===");
  const { data: verified } = await supabase
    .from("categories")
    .select("slug, name, image_url")
    .order("sort_order", { ascending: true });

  console.table(verified);
  console.log("\n=== STEP 1 EXECUTION COMPLETE ===");
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
