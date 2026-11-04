import { cache } from "react";

import {
  fetchCachedApprovedReviewStats,
  loadCachedPdpDetailsBySlug,
  loadCachedPdpProductBySlug,
} from "@/lib/db/store";
import { localCatalogPreviewEnabled } from "@/lib/local-catalog-preview";
import { EMPTY_APPROVED_REVIEW_STATS, type ApprovedReviewStats } from "@/lib/product-review-stats";

/** One cached Supabase read per slug per request (metadata + page share this). */
export const loadPdpProductBySlug = cache((slug: string) =>
  loadCachedPdpProductBySlug(slug),
);

/** Long-form copy for tabs — streamed below the fold. */
export const loadPdpProductDetailsBySlug = cache((slug: string) =>
  loadCachedPdpDetailsBySlug(slug),
);

/** Approved customer reviews only — shared by buy box + JSON-LD per request. */
export const loadPdpReviewStats = cache(
  (productId: string): Promise<ApprovedReviewStats> =>
    localCatalogPreviewEnabled()
      ? Promise.resolve(EMPTY_APPROVED_REVIEW_STATS)
      : fetchCachedApprovedReviewStats(productId),
);
