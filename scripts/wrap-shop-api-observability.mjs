/**
 * Wrap storefront Route Handlers with withShopApiObservability.
 * Skips checkout (checkout-slo logs) and already-wrapped files.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const API_ROOT = join(ROOT, "apps", "storefront", "app", "api");
const IMPORT_LINE =
  'import { withShopApiObservability } from "@/lib/shop-api-observability";\n';

const SKIP_SUBSTRINGS = [join("checkout", "route.ts")];

function walkRoutes(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkRoutes(p, out);
    else if (name === "route.ts") out.push(p);
  }
  return out;
}

function apiPathFromFile(file) {
  const rel = relative(join(ROOT, "apps", "storefront", "app"), dirname(file))
    .replace(/\\/g, "/")
    .replace(/\[([^\]]+)\]/g, ":$1");
  return `/${rel}`;
}

function wrapFile(file) {
  if (SKIP_SUBSTRINGS.some((s) => file.includes(s))) {
    return { file, status: "skip-checkout" };
  }

  let src = readFileSync(file, "utf8");
  if (src.includes("withShopApiObservability")) {
    return { file, status: "skip-done" };
  }

  const methods = [];
  src = src.replace(
    /export async function (GET|POST|PATCH|PUT|DELETE)(\([\s\S]*?\))\s*\{/g,
    (_, method, args) => {
      methods.push(method);
      return `async function ${method}Handler${args} {`;
    },
  );

  if (methods.length === 0) return { file, status: "skip" };

  const path = apiPathFromFile(file);
  const firstImport = src.match(/^import .+\n/m);
  if (firstImport) {
    const at = src.indexOf(firstImport[0]) + firstImport[0].length;
    src = src.slice(0, at) + IMPORT_LINE + src.slice(at);
  } else {
    src = IMPORT_LINE + src;
  }

  const block = methods
    .map(
      (m) =>
        `export const ${m} = withShopApiObservability("${m} ${path}", ${m}Handler);`,
    )
    .join("\n");

  src = src.trimEnd() + "\n\n" + block + "\n";
  writeFileSync(file, src, "utf8");
  return { file, status: "wrapped", methods };
}

const files = walkRoutes(API_ROOT);
const results = files.map(wrapFile);
const wrapped = results.filter((r) => r.status === "wrapped");
console.log(
  `Wrapped ${wrapped.length} / ${files.length} shop route files (checkout uses checkout-slo)`,
);
