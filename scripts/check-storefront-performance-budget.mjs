import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = path.join(root, "apps", "storefront", ".next");
const manifestPath = path.join(buildDir, "app-build-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const KB = 1024;
const layoutFiles = new Set(manifest.pages["/layout"] ?? []);
const failures = [];

async function totalBytes(files, extension) {
  let bytes = 0;
  for (const file of new Set(files)) {
    if (!file.endsWith(extension)) continue;
    bytes += (await stat(path.join(buildDir, file))).size;
  }
  return bytes;
}

function record(label, bytes, limitKb) {
  const actualKb = Math.ceil(bytes / KB);
  const status = actualKb <= limitKb ? "PASS" : "FAIL";
  console.log(`${status} ${label}: ${actualKb} KB (budget ${limitKb} KB)`);
  if (status === "FAIL") failures.push(`${label}: ${actualKb} KB > ${limitKb} KB`);
}

record("shared layout JavaScript", await totalBytes(layoutFiles, ".js"), 620);
record("shared layout CSS", await totalBytes(layoutFiles, ".css"), 180);

const routes = [
  ["home", "/page"],
  ["products", "/products/page"],
  ["product detail", "/product/[slug]/page"],
  ["checkout", "/checkout/page"],
];

for (const [label, route] of routes) {
  const files = manifest.pages[route];
  if (!files) {
    failures.push(`${label}: route ${route} missing from app build manifest`);
    continue;
  }
  const routeOnly = files.filter((file) => !layoutFiles.has(file));
  const initial = [...new Set([...layoutFiles, ...files])];
  record(`${label} route-only JavaScript`, await totalBytes(routeOnly, ".js"), 145);
  record(`${label} initial JavaScript`, await totalBytes(initial, ".js"), 720);
}

if (failures.length) {
  console.error("\nStorefront performance budget failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nStorefront performance budgets passed.");
