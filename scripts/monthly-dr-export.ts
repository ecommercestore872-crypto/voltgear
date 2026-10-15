/**
 * Monthly off-site export of critical commerce tables (local `backups/` — gitignored).
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in env (.env.local).
 *
 *   npm run export:dr
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import {
  buildDrExportManifest,
  DR_EXPORT_TABLES,
  drExportMonthFolder,
  type DrExportTable,
} from "../packages/shared/lib/dr-export-rules";
import { getServiceClient } from "../packages/shared/lib/supabase/server";

const PAGE = 500;
const repoRoot = path.resolve(import.meta.dirname, "..");
const backupsRoot = path.join(repoRoot, "backups");

function projectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

async function main() {
  const month = drExportMonthFolder();
  const outDir = path.join(backupsRoot, month);
  mkdirSync(outDir, { recursive: true });

  const counts: Partial<Record<DrExportTable, number>> = {};
  const sha256: Partial<Record<DrExportTable, string>> = {};
  const unavailableTables: DrExportTable[] = [];
  for (const table of DR_EXPORT_TABLES) {
    const db = getServiceClient({ admin: true });
    const rows: Record<string, unknown>[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await db
        .from(table)
        .select("*")
        .range(from, from + PAGE - 1);
      if (error) {
        if (error.code === "PGRST205") {
          unavailableTables.push(table);
          console.warn(`skipped ${table} (not present in this schema)`);
          break;
        }
        throw new Error(`${table}: ${error.message}`);
      }
      const batch = (data ?? []) as Record<string, unknown>[];
      rows.push(...batch);
      if (batch.length < PAGE) break;
      from += PAGE;
    }
    if (unavailableTables.includes(table)) continue;
    counts[table] = rows.length;
    const json = JSON.stringify(rows);
    writeFileSync(path.join(outDir, `${table}.json`), json, { encoding: "utf8", mode: 0o600 });
    sha256[table] = createHash("sha256").update(json).digest("hex");
    console.log(`wrote ${table}.json (${rows.length} rows)`);
  }

  const manifest = buildDrExportManifest({
    exportedAt: new Date().toISOString(),
    supabaseProjectRef: projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    counts,
    sha256,
    unavailableTables,
  });
  writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    { encoding: "utf8", mode: 0o600 },
  );

  console.log(`\nDR export complete → ${outDir}`);
  console.log("Store this folder off-machine (encrypted drive). Contains order PII.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
