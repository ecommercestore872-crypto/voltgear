import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "apps", "storefront", "public");

async function generateCategoryThumbnails() {
  const sourceDir = path.join(publicDir, "categories");
  const outputDir = path.join(sourceDir, "thumb");
  await mkdir(outputDir, { recursive: true });

  const files = (await readdir(sourceDir)).filter((file) =>
    file.toLowerCase().endsWith(".webp"),
  );
  await Promise.all(
    files.map((file) =>
      sharp(path.join(sourceDir, file))
        .resize(256, 256, { fit: "contain", withoutEnlargement: true })
        .webp({ quality: 76, effort: 6 })
        .toFile(path.join(outputDir, file)),
    ),
  );
  return files.length;
}

async function generateBrandSeal() {
  await sharp(path.join(publicDir, "brand", "bnt-seal.webp"))
    .resize(192, 192, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(path.join(publicDir, "brand", "bnt-seal-192.webp"));
}

const count = await generateCategoryThumbnails();
await generateBrandSeal();
console.log(`Generated ${count} category thumbnails and the 192px brand seal.`);
