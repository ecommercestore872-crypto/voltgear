import {
  approvedReviewStatsFromRows,
  type ApprovedReviewStats,
  EMPTY_APPROVED_REVIEW_STATS,
} from "@/lib/product-review-stats";
import { getServiceClient } from "@/lib/supabase/server";

function db() {
  return getServiceClient();
}

/** Live stats from admin-approved `review_submissions` only. */
export async function fetchApprovedReviewStats(
  productId: string,
): Promise<ApprovedReviewStats> {
  const id = productId.trim();
  if (!id) return EMPTY_APPROVED_REVIEW_STATS;
  const { data, error } = await db()
    .from("review_submissions")
    .select("rating")
    .eq("product_id", id)
    .eq("status", "approved");
  if (error) throw error;
  return approvedReviewStatsFromRows(data ?? []);
}

/** Align `products.rating` / `review_count` with approved submissions (admin + one-off cleanup). */
export async function syncProductReviewStats(productId: string): Promise<ApprovedReviewStats> {
  const id = productId.trim();
  const stats = await fetchApprovedReviewStats(id);
  const { error } = await db()
    .from("products")
    .update({
      review_count: stats.count,
      rating: stats.count > 0 ? stats.averageRating : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  return stats;
}
