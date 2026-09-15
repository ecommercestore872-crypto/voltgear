import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

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
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PUBLIC_DIR = path.join(process.cwd(), "public");

// Fallback image per category — known good local stubs used as placeholder for now.
// Maps category → a real placeholder URL we know works.
const CATEGORY_PLACEHOLDER_URLS = {
  "earbuds": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80",
  "smartwatch": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
  "charger": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  "power-bank": "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=600&q=80",
  "tripod": "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80",
  "selfie-stick": "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80",
  "microphones": "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80",
  "ring-light": "https://images.unsplash.com/photo-1598517218592-5e3f2d6f50b9?w=600&q=80",
  "accessories": "https://images.unsplash.com/photo-1551721434-8b94ddff0e6d?w=600&q=80",
  "default": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&q=80",
};

async function isImageBroken(url) {
  if (!url) return true;
  if (url.startsWith("/")) {
    const filePath = path.join(PUBLIC_DIR, url);
    if (!fs.existsSync(filePath)) return true;
    const size = fs.statSync(filePath).size;
    return size < 15000; // placeholder stub
  }
  if (url.includes("cloudinary.com")) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return !res.ok;
    } catch {
      return true;
    }
  }
  return false;
}

const { data: products } = await supabase
  .from("products")
  .select("id, name, slug, category, cloudinary_images, product_images(id, url, sort_order)")
  .eq("status", "published")
  .order("name");

let fixed = 0;
let skipped = 0;

for (const p of products ?? []) {
  const images = (p.product_images ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const primaryUrl = images[0]?.url ?? (p.cloudinary_images?.[0] ?? null);

  const broken = await isImageBroken(primaryUrl);
  if (!broken) {
    skipped++;
    continue;
  }

  console.log(`[FIX] ${p.slug} (${p.category}) — uploading placeholder...`);

  const fallbackUrl = CATEGORY_PLACEHOLDER_URLS[p.category] ?? CATEGORY_PLACEHOLDER_URLS["default"];

  try {
    const uploaded = await cloudinary.uploader.upload(fallbackUrl, {
      folder: "ecommerce-store/products",
      public_id: `placeholder-${p.slug}`,
      overwrite: true,
      resource_type: "image",
      transformation: [{ width: 800, height: 800, crop: "fill", quality: "auto", fetch_format: "webp" }],
    });

    const newUrl = uploaded.secure_url;

    // Delete stale product_images rows and insert a fresh one
    if (images.length > 0) {
      await supabase.from("product_images").delete().eq("product_id", p.id);
    }

    const { error: insErr } = await supabase.from("product_images").insert({
      product_id: p.id,
      url: newUrl,
      sort_order: 0,
      source: "cloudinary",
    });

    if (insErr) {
      console.error(`  ✗ DB insert failed for ${p.slug}:`, insErr.message);
    } else {
      console.log(`  ✓ Fixed: ${newUrl}`);
      fixed++;
    }
  } catch (err) {
    console.error(`  ✗ Upload failed for ${p.slug}:`, err.message);
  }
}

console.log(`\nDone. Fixed: ${fixed}  Skipped (already OK): ${skipped}`);
