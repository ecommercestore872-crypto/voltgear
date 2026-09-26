/**
 * One-shot: wrap admin app Route Handlers with withAdminApiObservability.
 * Idempotent — skips files with no bare `export async function METHOD`.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const API_ROOT = join(ROOT, "apps", "admin", "app", "api");
const IMPORT_LINE =
  'import { withAdminApiObservability } from "@/lib/admin-api-observability";\n';

function walkRoutes(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkRoutes(p, out);
    else if (name === "route.ts") out.push(p);
  }
  return out;
}

function apiPathFromFile(file) {
  const rel = relative(join(ROOT, "apps", "admin", "app"), dirname(file))
    .replace(/\\/g, "/")
    .replace(/\[([^\]]+)\]/g, ":$1");
  return `/${rel}`;
}

function wrapFile(file) {
  let src = readFileSync(file, "utf8");
  if (!/export async function (GET|POST|PATCH|PUT|DELETE)\s*\(/.test(src)) {
    return { file, status: "skip" };
  }

  const path = apiPathFromFile(file);
  const methods = [];

  src = src.replace(
    /export async function (GET|POST|PATCH|PUT|DELETE)(\s*\([^)]*\))/g,
    (_, method, args) => {
      methods.push(method);
      return `async function ${method}Handler${args}`;
    },
  );

  if (methods.length === 0) return { file, status: "skip" };

  if (!src.includes("withAdminApiObservability")) {
    const firstImport = src.match(/^import .+\n/m);
    if (firstImport) {
      const at = src.indexOf(firstImport[0]) + firstImport[0].length;
      src = src.slice(0, at) + IMPORT_LINE + src.slice(at);
    } else {
      src = IMPORT_LINE + src;
    }
  }

  const block = methods
    .map(
      (m) =>
        `export const ${m} = withAdminApiObservability("${m} ${path}", ${m}Handler);`,
    )
    .join("\n");

  if (src.includes(`export const ${methods[0]} = withAdminApiObservability`)) {
    return { file, status: "skip" };
  }

  src = src.trimEnd() + "\n\n" + block + "\n";
  writeFileSync(file, src, "utf8");
  return { file, status: "wrapped", methods };
}

const files = walkRoutes(API_ROOT);
const wrapped = files.map(wrapFile).filter((r) => r.status === "wrapped");
console.log(`Wrapped ${wrapped.length} / ${files.length} route files`);
