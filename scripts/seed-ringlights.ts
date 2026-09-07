import { createClient as createSupabase } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

import { readSupabaseEnv } from "../lib/db/migration-rules";
import { textToPortableText } from "../lib/product-detail-copy";
import {
  RINGLIGHTS_DATA,
  RINGLIGHTS_KEEP_SLUGS,
} from "./data/ringlights-catalog";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const supabaseEnv = readSupabaseEnv({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

const supabase = createSupabase(supabaseEnv.url, supabaseEnv.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const KEEP = new Set<string>(RINGLIGHTS_KEEP_SLUGS);

async function seed() {
  console.log(`Upserting ${RINGLIGHTS_DATA.length} ring light products...`);

  for (const prod of RINGLIGHTS_DATA) {
    const sanityId = `seed-${prod.slug}`;
    console.log(`Upserting: ${prod.name} (${prod.slug})`);

    const { data, error } = await supabase
      .from("products")
      .upsert(
        {
          sanity_id: sanityId,
          name: prod.name,
          slug: prod.slug,
          brand: prod.brand,
          sku: prod.sku,
          category: prod.category,
          price: prod.price,
          compare_at_price: prod.compareAtPrice,
          short_description: prod.shortDescription,
          description: textToPortableText(prod.details),
          features: prod.features,
          specifications: prod.specifications,
          compatibility: prod.compatibility,
          in_the_box: prod.inTheBox,
          stock_status: prod.stockStatus,
          rating: prod.rating,
          review_count: prod.reviewCount,
          featured: prod.featured,
          badge: prod.badge,
          status: "published",
          cloudinary_images: [],
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (error || !data) {
      console.error(`Error inserting product ${prod.slug}:`, error);
      continue;
    }

    const productId = data.id;
    await supabase.from("product_images").delete().eq("product_id", productId);
    const { error: imgErr } = await supabase.from("product_images").insert({
      product_id: productId,
      url: prod.image,
      sort_order: 0,
      source: "local",
    });

    if (imgErr) {
      console.error(`Error inserting image for ${prod.slug}:`, imgErr);
    } else {
      console.log(`Seeded ${prod.slug}`);
    }
  }

  // Move the light-stand SKU out of ring-light; unpublish any other extras.
  const { data: extras, error: extrasErr } = await supabase
    .from("products")
    .select("id, slug, name")
    .eq("category", "ring-light");

  if (extrasErr) {
    console.error("Failed to list ring-light products for cleanup:", extrasErr);
  } else {
    for (const row of extras ?? []) {
      if (KEEP.has(row.slug)) continue;

      if (row.slug === "studio-heavy-duty-2-1m-tripod-stand") {
        const { error } = await supabase
          .from("products")
          .update({ category: "selfie-stick", badge: "2.1 Meter Metal" })
          .eq("id", row.id);
        console.log(
          error
            ? `Failed moving tripod ${row.slug}: ${error.message}`
            : `Moved ${row.slug} → selfie-stick`
        );
        continue;
      }

      const { error } = await supabase
        .from("products")
        .update({ status: "unpublished" })
        .eq("id", row.id);
      console.log(
        error
          ? `Failed unpublishing ${row.slug}: ${error.message}`
          : `Unpublished non-catalog ring-light: ${row.slug}`
      );
    }
  }

  const { data: live, error: liveErr } = await supabase
    .from("products")
    .select("slug, name, badge, status")
    .eq("category", "ring-light")
    .eq("status", "published")
    .order("name");

  if (liveErr) {
    console.error("Verify query failed:", liveErr);
  } else {
    console.log(`\nPublished ring-light products (${live?.length ?? 0}):`);
    for (const p of live ?? []) {
      console.log(`- ${p.slug} | ${p.badge} | ${p.name}`);
    }
  }

  console.log("Ring Lights seeding process completed!");
}

seed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
