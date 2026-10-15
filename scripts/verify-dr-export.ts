/**
 * Verify the latest (or given) monthly DR export on disk.
 *   npm run verify:dr
 *   npm run verify:dr -- --month=2026-09
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import {
  DR_EXPORT_TABLES,
  validateDrExportManifest,
  type DrExportManifest,
} from "../packages/shared/lib/dr-export-rules";

const repoRoot = path.resolve(import.meta.dirname, "..");
const backupsRoot = path.join(repoRoot, "backups");

function parseMonthArg(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--month="));
  return arg ? arg.slice("--month=".length) : null;
}

function latestMonthDir(): string | null {
  if (!existsSync(backupsRoot)) return null;
  const dirs = readdirSync(backupsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  return dirs.at(-1) ?? null;
}

function main() {
  const month = parseMonthArg() ?? latestMonthDir();
  if (!month) {
    console.error("No backups/ folder or month directory found. Run npm run export:dr first.");
    process.exit(1);
  }

  const dir = path.join(backupsRoot, month);
  const manifestPath = path.join(dir, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("Missing manifest.json in", dir);
    process.exit(1);
  }

  let manifest: DrExportManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as DrExportManifest;
  } catch {
    console.error("Invalid manifest JSON");
    process.exit(1);
  }

  if (!validateDrExportManifest(manifest)) {
    console.error("Manifest failed schema validation");
    process.exit(1);
  }

  let failed = false;
  for (const table of DR_EXPORT_TABLES) {
    if (manifest.unavailableTables.includes(table)) {
      console.log(`skip ${table} (not present when exported)`);
      continue;
    }
    const file = path.join(dir, `${table}.json`);
    if (!existsSync(file)) {
      console.error("missing file:", `${table}.json`);
      failed = true;
      continue;
    }
    let rows: unknown;
    let raw: string;
    try {
      raw = readFileSync(file, "utf8");
      rows = JSON.parse(raw);
    } catch {
      console.error("invalid JSON:", table);
      failed = true;
      continue;
    }
    if (!Array.isArray(rows)) {
      console.error("not an array:", table);
      failed = true;
      continue;
    }
    if (rows.length !== manifest.tables[table]) {
      console.error(
        `row count mismatch ${table}: file=${rows.length} manifest=${manifest.tables[table]}`,
      );
      failed = true;
      continue;
    }
    const digest = createHash("sha256").update(raw).digest("hex");
    if (digest !== manifest.sha256[table]) {
      console.error(`checksum mismatch ${table}`);
      failed = true;
      continue;
    }
    console.log(`ok  ${table}.json (${rows.length} rows)`);
  }

  if (failed) process.exit(1);
  console.log(`\nDR verify passed for ${month} (totalRows=${manifest.totalRows})`);
}

main();
