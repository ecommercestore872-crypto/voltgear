import type { ProductReview } from "@/lib/types";

export type ApprovedReviewStats = {
  count: number;
  averageRating: number;
};

export const EMPTY_APPROVED_REVIEW_STATS: ApprovedReviewStats = {
  count: 0,
  averageRating: 0,
};

export function approvedReviewStatsFromRows(
  rows: { rating?: number | null }[],
): ApprovedReviewStats {
  const ratings = rows
    .map((r) => (r.rating != null ? Number(r.rating) : NaN))
    .filter((n) => Number.isFinite(n) && n > 0);
  const count = ratings.length;
  if (!count) return EMPTY_APPROVED_REVIEW_STATS;
  const averageRating =
    Math.round((ratings.reduce((sum, n) => sum + n, 0) / count) * 10) / 10;
  return { count, averageRating };
}

export function approvedReviewStatsFromReviews(
  reviews: ProductReview[],
): ApprovedReviewStats {
  return approvedReviewStatsFromRows(
    reviews.map((r) => ({ rating: r.rating })),
  );
}
