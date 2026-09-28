/**
 * Converts blog cover PNGs to WebP (keeps originals). Writes to storefront + root public/blog.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const DIRS = [
  join(ROOT, "apps/storefront/public/blog"),
  join(ROOT, "public/blog"),
];

const PNG_COVERS = [
  "cover-tripod.png",
  "cover-selfie-stick.png",
  "cover-ring-light.png",
  "cover-microphone.png",
  "cover-stylus.png",
];

for (const dir of DIRS) {
  for (const png of PNG_COVERS) {
    const src = join(dir, png);
    if (!existsSync(src)) continue;
    const out = join(dir, png.replace(/\.png$/i, ".webp"));
    await sharp(src).webp({ quality: 86 }).toFile(out);
    console.log("wrote", out);
  }
}
