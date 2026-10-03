/**
 * One-off: set every product's rating/review_count from approved review_submissions only.
 * Run: npx tsx scripts/sync-product-review-stats.ts
 */
import { syncProductReviewStats } from "../packages/shared/lib/db/review-stats-store";
import { getServiceClient } from "../packages/shared/lib/supabase/server";

async function main() {
  const db = getServiceClient();
  const { data, error } = await db.from("products").select("id");
  if (error) throw error;
  let n = 0;
  for (const row of data ?? []) {
    const id = String(row.id ?? "").trim();
    if (!id) continue;
    await syncProductReviewStats(id);
    n += 1;
  }
  console.log(`Synced review stats for ${n} products.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
