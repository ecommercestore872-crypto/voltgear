/**
 * Build header/nav WebP logos from the premium PNG master.
 * Usage: node scripts/build-header-logo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const brandDir = path.join(root, "apps/storefront/public/brand");

const masters = [
  "buyntryy-logo-premium-v2.png",
  "buyntryy-header-logo-pro.png",
];

function findMaster() {
  for (const name of masters) {
    const p = path.join(brandDir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function writeNavWebp(inputPath, outName, { width, flatten }) {
  const out = path.join(brandDir, outName);
  let pipe = sharp(inputPath).trim({ threshold: 14 }).resize({ width, withoutEnlargement: true });
  if (flatten) {
    pipe = pipe.flatten({ background: flatten });
  }
  await pipe.webp({ quality: 90, effort: 6, smartSubsample: true }).toFile(out);
  console.log(`Wrote ${outName} (${fs.statSync(out).size} bytes)`);
}

const master = findMaster();
if (!master) {
  console.error(
    "Missing premium PNG in apps/storefront/public/brand/ (buyntryy-logo-premium-v2.png)",
  );
  process.exit(1);
}

await writeNavWebp(master, "buyntryy-header-nav.webp", { width: 560 });
await writeNavWebp(master, "buyntryy-header-nav-light.webp", {
  width: 560,
  flatten: "#1f3626",
});
