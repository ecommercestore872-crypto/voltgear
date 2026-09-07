import { createClient as createSupabase } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

import { readSupabaseEnv } from "../lib/db/migration-rules";
import { textToPortableText } from "../lib/product-detail-copy";
import { TRIPODS_DATA, TRIPODS_KEEP_SLUGS } from "./data/tripods-catalog";

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

const KEEP = new Set<string>(TRIPODS_KEEP_SLUGS);

async function ensureTripodCategory() {
  const { data: selfie } = await supabase
    .from("categories")
    .select("image_url")
    .eq("slug", "selfie-stick")
    .maybeSingle();

  const imageUrl =
    selfie?.image_url ||
    "/categories/selfie-stick.png";

  const { error } = await supabase.from("categories").upsert(
    {
      slug: "tripod",
      name: "Tripods & Stands",
      description:
        "Camera and phone tripods for creators — overhead, boom-arm, AI tracking and full-size stands. Cash on delivery from Buy n Try.",
      image_url: imageUrl,
      sort_order: 7,
    },
    { onConflict: "slug" }
  );

  if (error) {
    console.error("Failed to upsert tripod category:", error);
  } else {
    console.log("Ensured category: tripod");
  }

  await supabase
    .from("categories")
    .update({
      name: "Selfie Sticks",
      description:
        "Portable Bluetooth selfie sticks with remote and tripod modes.",
      sort_order: 6,
    })
    .eq("slug", "selfie-stick");

  await supabase
    .from("categories")
    .update({ sort_order: 8 })
    .eq("slug", "microphones");
}

async function seed() {
  await ensureTripodCategory();

  console.log(`Upserting ${TRIPODS_DATA.length} tripod products...`);

  for (const prod of TRIPODS_DATA) {
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

  // Unpublish non-catalog tripod SKUs (previous Plokama floor stands, etc.).
  const { data: candidates } = await supabase
    .from("products")
    .select("id, slug, category, status")
    .eq("category", "tripod");

  for (const row of candidates ?? []) {
    if (KEEP.has(row.slug)) continue;
    const { error } = await supabase
      .from("products")
      .update({ status: "unpublished" })
      .eq("id", row.id);
    console.log(
      error
        ? `Failed cleaning ${row.slug}: ${error.message}`
        : `Unpublished non-catalog tripod: ${row.slug}`
    );
  }

  const { data: live } = await supabase
    .from("products")
    .select("slug, name, badge")
    .eq("category", "tripod")
    .eq("status", "published")
    .order("name");

  console.log(`\nPublished tripod products (${live?.length ?? 0}):`);
  for (const p of live ?? []) {
    console.log(`- ${p.slug} | ${p.badge} | ${p.name}`);
  }

  console.log("Tripods seeding process completed!");
}

seed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
