/**
 * Weekly Purchase vs admin orders (requires Supabase env — use .env.local or `vercel env pull`).
 *
 *   npx tsx scripts/weekly-purchase-sanity.ts
 *   npx tsx scripts/weekly-purchase-sanity.ts --tiktok=12 --meta=9
 */
import { fetchPurchaseSanityOrderRows } from "../packages/shared/lib/db/purchase-sanity-store";
import { buildPurchaseSanityReport } from "../packages/shared/lib/purchase-sanity-rules";

function parseArg(name: string): number | null {
  const prefix = `--${name}=`;
  const raw = process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function main() {
  const rows = await fetchPurchaseSanityOrderRows();
  const report = buildPurchaseSanityReport({
    preset: "last7",
    rows,
    tiktokPurchases: parseArg("tiktok"),
    metaPurchases: parseArg("meta"),
  });

  console.log(JSON.stringify(report, null, 2));
  if (report.overallStatus === "critical") process.exit(2);
  if (report.overallStatus === "warning") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
