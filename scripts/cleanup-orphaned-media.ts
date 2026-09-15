import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { v2 as cloudinary } from "cloudinary";
import { getServiceClient } from "../lib/supabase/server";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// HARD LIMIT — never delete more than this many assets in one run.
// This prevents catastrophic data loss from false-orphan detection.
const MAX_DELETIONS = 50;

async function run() {
  const adminDb = getServiceClient();
  console.log("Fetching all database rows to scan for active Image URLs...");
  
  const inUseUrls = new Set<string>();

  // ─── 1. Scan product_images table DIRECTLY (most important — primary image store) ───
  const { data: productImages } = await adminDb.from("product_images").select("url");
  for (const row of productImages ?? []) {
    if (row.url) inUseUrls.add(row.url.toLowerCase());
  }
  console.log(`product_images table: ${productImages?.length ?? 0} direct image URLs collected.`);

  // ─── 2. Scan all other tables via JSON dump ───
  const tables = [
    "products", "product_variants", "site_settings",
    "homepage_sections", "collections", "collection_products",
    "product_deals", "promo_codes", "product_reviews",
    "email_templates",
  ];
  
  for (const table of tables) {
    const { data, error } = await adminDb.from(table).select("*");
    if (error) {
      console.error(`Skipping table: ${table} (Not found or error)`);
      continue;
    }
    if (data) {
      const textDump = JSON.stringify(data);
      const cloudinaryMatches = textDump.match(/https?:\/\/[^\s"',]+\.cloudinary\.com[^\s"',]+/g) || [];
      const supabaseMatches = textDump.match(/https?:\/\/[^\s"',]+\/storage\/v1\/object\/public\/product-images\/[^\s"',]+/g) || [];
      const rawPublicIds = textDump.match(/ecommerce-store\/[A-Za-z0-9\/._-]+/g) || [];
      cloudinaryMatches.forEach(url => inUseUrls.add(url.toLowerCase()));
      supabaseMatches.forEach(url => inUseUrls.add(url.toLowerCase()));
      rawPublicIds.forEach(id => inUseUrls.add(id.toLowerCase()));
    }
  }

  console.log(`Found ${inUseUrls.size} total unique asset references in database.\n`);

  console.log("Scanning all Cloudinary buckets...");
  let nextCursor: string | null = null;
  let cloudinaryCount = 0;
  let deletedCloudinaryCount = 0;
  let orphans: string[] = [];
  
  do {
    const results: any = await cloudinary.api.resources({
      type: 'upload',
      max_results: 500,
      next_cursor: nextCursor
    });

    for (const res of results.resources) {
      cloudinaryCount++;
      const lowerUrl = res.secure_url.toLowerCase();
      const lowerId = res.public_id.toLowerCase();
      // Check URL, public_id substring match, AND partial path match
      const isUsed =
        Array.from(inUseUrls).some(u =>
          u.includes(lowerUrl) ||
          u.includes(lowerId) ||
          lowerUrl.includes(u) ||
          lowerId.includes(u)
        );
      if (!isUsed) {
        orphans.push(res.public_id);
      }
    }
    nextCursor = results.next_cursor ?? null;
  } while (nextCursor);

  console.log(`Cloudinary scan: ${cloudinaryCount} total, ${orphans.length} detected orphans.`);

  if (orphans.length > MAX_DELETIONS) {
    console.error(`\n⛔ SAFETY HALT: ${orphans.length} orphans detected but limit is ${MAX_DELETIONS}.`);
    console.error("This likely means the scanner is misidentifying in-use assets.");
    console.error("Review the orphan list below before deleting:");
    orphans.slice(0, 20).forEach(id => console.error(" -", id));
    console.error(`\n... and ${Math.max(0, orphans.length - 20)} more. Aborting — no deletions performed.`);
    return;
  }

  for (const publicId of orphans) {
    console.log(`[DELETING ORPHAN] ${publicId}`);
    await cloudinary.uploader.destroy(publicId);
    deletedCloudinaryCount++;
  }

  console.log(`\nCloudinary: Scanned ${cloudinaryCount} → Deleted ${deletedCloudinaryCount} orphans.`);

  console.log("\nScanning Supabase Storage buckets...");
  let supabaseCount = 0;
  let deletedSupabaseCount = 0;

  const folders = ["", "admin"];
  for (const folder of folders) {
      const { data: files, error } = await adminDb.storage.from("product-images").list(folder, { limit: 1500, offset: 0 });
      if (files && !error) {
        for (const file of files) {
          if (file.name === ".emptyFolderPlaceholder" || file.name === "admin" || !file.id) continue;
          supabaseCount++;
          const filePath = folder ? `${folder}/${file.name}` : file.name;
          const lowerPath = filePath.toLowerCase();
          
          const isUsed = Array.from(inUseUrls).some(u => u.includes(lowerPath));
          if (!isUsed) {
            if (deletedSupabaseCount >= MAX_DELETIONS) {
              console.error(`Safety limit hit for Supabase deletions.`);
              break;
            }
            console.log(`[DELETING ORPHAN SUPABASE] ${filePath}`);
            await adminDb.storage.from("product-images").remove([filePath]);
            deletedSupabaseCount++;
          }
        }
      }
  }

  console.log(`Supabase: Scanned ${supabaseCount} → Deleted ${deletedSupabaseCount} orphans.`);
  console.log("\nCleanup completed safely.");
}

run().catch(console.error);
