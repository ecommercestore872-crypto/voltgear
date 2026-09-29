/**
 * Category PNGs → transparent WebP.
 * Removes only the backdrop color connected to the image edge (sampled from corners),
 * then feathers the alpha so the outline stays photographic instead of jagged.
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT_DIRS = [
  join(ROOT, "apps/storefront/public/categories"),
  join(ROOT, "public/categories"),
];

const CANVAS = 800;
const HARD = 36;

function isChroma(r, g, b) {
  return g > 140 && g > r + 45 && g > b + 45;
}

function dist(r, g, b, br, bg, bb) {
  const dr = r - br;
  const dg = g - bg;
  const db = b - bb;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function sampleBackdrop(data, width, height, channels) {
  const points = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
    [width >> 1, 2],
    [2, height >> 1],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of points) {
    const i = (y * width + x) * channels;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const n = points.length;
  return [r / n, g / n, b / n];
}

function floodBackdrop(data, width, height, channels, backdrop) {
  const [br, bg, bb] = backdrop;
  const pixels = width * height;
  const seen = new Uint8Array(pixels);
  const stack = [];

  const isBackdrop = (x, y) => {
    const i = (y * width + x) * channels;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isChroma(r, g, b)) return true;
    return dist(r, g, b, br, bg, bb) <= HARD;
  };

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx] || !isBackdrop(x, y)) return;
    seen[idx] = 1;
    stack.push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (stack.length) {
    const idx = stack.pop();
    const x = idx % width;
    const y = (idx / width) | 0;
    data[idx * channels + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  /** Eat leftover green fringe and enclosed chroma holes. */
  for (let pass = 0; pass < 4; pass += 1) {
    const kill = [];
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const i = (y * width + x) * channels;
        if (data[i + 3] === 0) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const pure = r < 40 && b < 40 && g > 200;
        if (!isChroma(r, g, b) && !pure) continue;
        const neighbors = [
          data[((y * width + x - 1) * channels) + 3],
          data[((y * width + x + 1) * channels) + 3],
          data[(((y - 1) * width + x) * channels) + 3],
          data[(((y + 1) * width + x) * channels) + 3],
        ];
        if (pure || neighbors.some((a) => a === 0)) kill.push(i);
      }
    }
    for (const i of kill) data[i + 3] = 0;
  }

  /** Pull green spill off the remaining edge. */
  for (let i = 0; i < data.length; i += channels) {
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (g > r + 18 && g > b + 18) {
      data[i + 1] = Math.max(r, b);
    }
  }
}

async function pngToCutoutWebp(srcPath, destPath) {
  const prepared = await sharp(srcPath)
    .rotate()
    .resize(1100, 1100, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = prepared;
  floodBackdrop(
    data,
    info.width,
    info.height,
    info.channels,
    sampleBackdrop(data, info.width, info.height, info.channels),
  );

  const keyed = sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });

  const rgb = await keyed.clone().removeAlpha().png().toBuffer();
  const alpha = await keyed
    .clone()
    .extractChannel("alpha")
    .blur(0.45)
    .png()
    .toBuffer();

  const trimmed = await sharp(rgb)
    .joinChannel(alpha)
    .trim({ threshold: 1 })
    .png()
    .toBuffer();

  const fitted = await sharp(trimmed)
    .resize(Math.round(CANVAS * 0.9), Math.round(CANVAS * 0.9), {
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted, gravity: "center" }])
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(destPath);
}

const sourceDir = join(ROOT, "apps/storefront/public/categories");
const pngs = readdirSync(sourceDir).filter((f) => f.endsWith(".png"));

for (const outDir of OUT_DIRS) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
}

for (const png of pngs) {
  const src = join(sourceDir, png);
  const webpName = png.replace(/\.png$/i, ".webp");
  for (const outDir of OUT_DIRS) {
    await pngToCutoutWebp(src, join(outDir, webpName));
    console.log("wrote", join(outDir, webpName));
  }
}

console.log("done", pngs.length, "categories");
