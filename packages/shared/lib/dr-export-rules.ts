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
  "product_deals",
  "collections",
  "collection_products",
  "pages",
  "hero_sections",
  "hero_slides",
  "testimonials",
  "product_reviews",
  "review_submissions",
  "contact_submissions",
  "contact_submission_events",
  "newsletter_subscribers",
  "email_suppressions",
] as const;

export type DrExportTable = (typeof DR_EXPORT_TABLES)[number];

export type DrExportManifest = {
  version: 3;
  exportedAt: string;
  supabaseProjectRef: string | null;
  preset: "monthly";
  tables: Record<DrExportTable, number | null>;
  totalRows: number;
  sha256: Record<DrExportTable, string | null>;
  unavailableTables: DrExportTable[];
};

export function buildDrExportManifest(input: {
  exportedAt: string;
  supabaseProjectRef?: string | null;
  counts: Partial<Record<DrExportTable, number>>;
  sha256?: Partial<Record<DrExportTable, string>>;
  unavailableTables?: readonly DrExportTable[];
}): DrExportManifest {
  const unavailable = new Set(input.unavailableTables ?? []);
  const tables = {} as Record<DrExportTable, number | null>;
  let totalRows = 0;
  for (const name of DR_EXPORT_TABLES) {
    if (unavailable.has(name)) {
      tables[name] = null;
      continue;
    }
    const n = input.counts[name] ?? 0;
    tables[name] = n;
    totalRows += n;
  }
  return {
    version: 3,
    exportedAt: input.exportedAt,
    supabaseProjectRef: input.supabaseProjectRef ?? null,
    preset: "monthly",
    tables,
    totalRows,
    sha256: Object.fromEntries(
      DR_EXPORT_TABLES.map((name) => [
        name,
        unavailable.has(name) ? null : (input.sha256?.[name] ?? ""),
      ]),
    ) as Record<DrExportTable, string | null>,
    unavailableTables: [...unavailable],
  };
}

export function validateDrExportManifest(raw: unknown): raw is DrExportManifest {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as DrExportManifest;
  if (m.version !== 3 || m.preset !== "monthly") return false;
  if (typeof m.exportedAt !== "string" || typeof m.totalRows !== "number") return false;
  if (!m.tables || typeof m.tables !== "object") return false;
  if (!m.sha256 || typeof m.sha256 !== "object") return false;
  if (!Array.isArray(m.unavailableTables)) return false;
  const unavailable = new Set(m.unavailableTables);
  if (unavailable.size !== m.unavailableTables.length) return false;
  for (const name of DR_EXPORT_TABLES) {
    if (unavailable.has(name)) {
      if (m.tables[name] !== null || m.sha256[name] !== null) return false;
      continue;
    }
    if (typeof m.tables[name] !== "number") return false;
    if (!/^[0-9a-f]{64}$/i.test(m.sha256[name] ?? "")) return false;
  }
  if (m.unavailableTables.some((name) => !DR_EXPORT_TABLES.includes(name))) return false;
  return true;
}

/** YYYY-MM folder name for monthly exports. */
export function drExportMonthFolder(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}
