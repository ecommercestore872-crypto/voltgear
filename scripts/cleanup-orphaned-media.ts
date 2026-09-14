import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { v2 as cloudinary } from "cloudinary";
import { getServiceClient } from "../lib/supabase/server";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function run() {
  const adminDb = getServiceClient();
  console.log("Fetching all database rows to scan for active Image URLs...");
  
  // 1. Fetch tables known to have images or text
  const tables = [
    "products", "product_variants", "site_settings",
    "homepage_sections", "collections", "collection_products",
    "product_deals", "promo_codes", "product_reviews",
    "customer_profiles", "email_templates", "orders" // Orders contain avatar images?
  ];
  
  const inUseUrls = new Set<string>();
  
  for (const table of tables) {
    const { data, error } = await adminDb.from(table).select("*");
    if (error) {
      console.error(`Skipping table: ${table} (Not found or error)`);
      continue;
    }
    if (data) {
      const textDump = JSON.stringify(data);
      // Extremely permissive matching: grab any Cloudinary asset URL structure.
      const cloudinaryMatches = textDump.match(/https?:\/\/[^\s"',]+\.cloudinary\.com[^\s"',]+/g) || [];
      // Grab any Supabase storage bucket URLs targeting product-images.
      const supabaseMatches = textDump.match(/https?:\/\/[^\s"',]+\/[^\s"',]*\/storage\/v1\/object\/public\/product-images\/[^\s"',]+/g) || [];
      
      cloudinaryMatches.forEach(url => inUseUrls.add(url.toLowerCase()));
      supabaseMatches.forEach(url => inUseUrls.add(url.toLowerCase()));
      
      // Also match raw public IDs if they were stored as strings like "ecommerce-store/products/xxx"
      const rawPublicIds = textDump.match(/ecommerce-store\/products\/[A-Za-z0-9\/._-]+/g) || [];
      rawPublicIds.forEach(id => inUseUrls.add(id.toLowerCase()));
    }
  }

  console.log(`Found ${inUseUrls.size} unique image URLs heavily embedded natively across the entire Database.`);

  console.log("\nScanning all Cloudinary buckets autonomously...");
  let nextCursor = null;
  let cloudinaryCount = 0;
  let deletedCloudinaryCount = 0;
  
  // Iterate strictly all Cloudinary Assets
  do {
    const results: any = await cloudinary.api.resources({
      type: 'upload',
      max_results: 500,
      next_cursor: nextCursor
    });

    for (const res of results.resources) {
      cloudinaryCount++;
      // Check if URL or public ID exists in the tracked references
      const lowerUrl = res.secure_url.toLowerCase();
      const lowerId = res.public_id.toLowerCase();
      const isUsed = Array.from(inUseUrls).some(u => u.includes(lowerUrl) || u.includes(lowerId));
      if (!isUsed) {
        console.log(`[ORPHAN DETECTED] Removing Cloudinary Asset: ${res.public_id} (${res.secure_url})`);
        await cloudinary.uploader.destroy(res.public_id);
        deletedCloudinaryCount++;
      }
    }
    nextCursor = results.next_cursor;
  } while (nextCursor);
  
  console.log(`\nCloudinary Scan Complete -> Indexed: ${cloudinaryCount} files, Deleted: ${deletedCloudinaryCount}`);

  console.log("\nScanning Supabase Storage buckets natively...");
  let supabaseCount = 0;
  let deletedSupabaseCount = 0;

  // Supabase lists top level contents
  const folders = ["", "admin"];
  for (const folder of folders) {
      const { data: files, error } = await adminDb.storage.from("product-images").list(folder, { limit: 1500, offset: 0 });
      if (files && !error) {
        for (const file of files) {
          if (file.name === ".emptyFolderPlaceholder" || file.name === "admin" || !file.id) continue;
          supabaseCount++;
          const path = folder ? `${folder}/${file.name}` : file.name;
          const lowerPath = path.toLowerCase();
          
          const isUsed = Array.from(inUseUrls).some(u => u.includes(lowerPath));
          if (!isUsed) {
            console.log(`[ORPHAN DETECTED] Removing Postgres Memory Asset: ${path}`);
            await adminDb.storage.from("product-images").remove([path]);
            deletedSupabaseCount++;
          }
        }
      }
  }

  console.log(`\nSupabase Scan Complete -> Indexed: ${supabaseCount} files, Deleted: ${deletedSupabaseCount}`);
  console.log("\nCleanup successfully completed.");
}

run().catch(console.error);
