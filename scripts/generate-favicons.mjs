/**
 * Favicons + logo.png from the real BNT seal (same as header).
 * Full-bleed forest green — no transparent/white corners in tabs or Google.
 * Output: apps/storefront/public/favicon-*.png + favicon.ico + logo.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "apps/storefront/public");
const sealPath = path.join(outDir, "brand/bnt-seal.png");

if (!fs.existsSync(sealPath)) {
  console.error("Missing", sealPath);
  process.exit(1);
}

/** Matches shop forest / theme_color (#1F3626) */
const forest = { r: 31, g: 54, b: 38 };

const sizes = [16, 32, 48, 96, 144, 180, 192, 512];

function raster(size) {
  return sharp(sealPath)
    .flatten({ background: forest })
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9, adaptiveFiltering: true, force: true });
}

for (const size of sizes) {
  const out = path.join(outDir, `favicon-${size}.png`);
  await raster(size).toFile(out);
  console.log(`Wrote favicon-${size}.png`);
}

await raster(32).toFile(path.join(outDir, "favicon.ico"));
await raster(512).toFile(path.join(outDir, "logo.png"));

console.log("Wrote favicon.ico and logo.png from brand/bnt-seal.png");
