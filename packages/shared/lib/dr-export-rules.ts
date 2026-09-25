/** Critical commerce tables for off-site monthly export (not a full DB dump). */

export const DR_EXPORT_TABLES = [
  "products",
  "product_images",
  "product_variants",
  "orders",
  "order_items",
  "order_status_history",
  "site_settings",
  "promo_codes",
] as const;

export type DrExportTable = (typeof DR_EXPORT_TABLES)[number];

export type DrExportManifest = {
  version: 1;
  exportedAt: string;
  supabaseProjectRef: string | null;
  preset: "monthly";
  tables: Record<DrExportTable, number>;
  totalRows: number;
};

export function buildDrExportManifest(input: {
  exportedAt: string;
  supabaseProjectRef?: string | null;
  counts: Partial<Record<DrExportTable, number>>;
}): DrExportManifest {
  const tables = {} as Record<DrExportTable, number>;
  let totalRows = 0;
  for (const name of DR_EXPORT_TABLES) {
    const n = input.counts[name] ?? 0;
    tables[name] = n;
    totalRows += n;
  }
  return {
    version: 1,
    exportedAt: input.exportedAt,
    supabaseProjectRef: input.supabaseProjectRef ?? null,
    preset: "monthly",
    tables,
    totalRows,
  };
}

export function validateDrExportManifest(raw: unknown): raw is DrExportManifest {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as DrExportManifest;
  if (m.version !== 1 || m.preset !== "monthly") return false;
  if (typeof m.exportedAt !== "string" || typeof m.totalRows !== "number") return false;
  if (!m.tables || typeof m.tables !== "object") return false;
  for (const name of DR_EXPORT_TABLES) {
    if (typeof m.tables[name] !== "number") return false;
  }
  return true;
}

/** YYYY-MM folder name for monthly exports. */
export function drExportMonthFolder(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}
