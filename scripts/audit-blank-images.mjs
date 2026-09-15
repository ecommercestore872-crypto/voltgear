import { createClient } from "@supabase/supabase-js";
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PUBLIC_DIR = path.join(process.cwd(), "public");

// Check all products for broken local image references
const { data: products } = await supabase
  .from("products")
  .select("id, name, slug, cloudinary_images, product_images(url, sort_order)")
  .eq("status", "published")
  .order("name");

let brokenCount = 0;

for (const p of products ?? []) {
  const images = (p.product_images ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const primaryUrl = images[0]?.url ?? (p.cloudinary_images?.[0] ?? null);

  if (!primaryUrl) {
    console.log(`[NO IMAGE] ${p.slug} — ${p.name}`);
    brokenCount++;
    continue;
  }

  // Check if it's a local path reference
  if (primaryUrl.startsWith("/")) {
    const filePath = path.join(PUBLIC_DIR, primaryUrl);
    if (!fs.existsSync(filePath)) {
      console.log(`[MISSING FILE] ${p.slug} → ${primaryUrl}`);
      brokenCount++;
    } else {
      const size = fs.statSync(filePath).size;
      if (size < 15000) {
        // Tiny = likely placeholder stub
        console.log(`[STUB/PLACEHOLDER] ${p.slug} → ${primaryUrl} (${size} bytes)`);
        brokenCount++;
      }
    }
  } else if (primaryUrl.includes("cloudinary.com")) {
    // Cloudinary URL — check we can HEAD it
    try {
      const res = await fetch(primaryUrl, { method: "HEAD" });
      if (!res.ok) {
        console.log(`[CLOUDINARY BROKEN] ${p.slug} → HTTP ${res.status} → ${primaryUrl}`);
        brokenCount++;
      }
    } catch (e) {
      console.log(`[CLOUDINARY UNREACHABLE] ${p.slug} → ${primaryUrl}`);
      brokenCount++;
    }
  }
}

console.log(`\nTotal broken products: ${brokenCount} / ${products?.length ?? 0}`);
