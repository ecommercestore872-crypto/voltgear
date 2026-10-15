import {
  fetchAllProducts as fetchAllProductsForReviews,
  fetchProductBySlug as fetchProductBySlugForReview,
} from "@/lib/db/store-catalog-store";
import {
  projectReviewProducts,
  submitReviewForProduct,
  type StorefrontReviewInput,
  type StorefrontReviewResult,
} from "@/lib/db/store-review-store";

export {
  allocatePublicOrderId,
  appendOrderHistoryNote,
  cancelOrderRestoreInventoryRow,
  createOrderRow,
  deleteOrderRow,
  getAllOrders,
  getDeliveredOrdersWithItemsForDeals,
  getLightweightOrders,
  getOrderByPublicId,
  getOrdersByEmail,
  getOrdersByPhone,
  listDeliveredOrdersForDealSuggestions,
  listOrderIdsForPostExSync,
  updateOrderAttributionRow,
  updateOrderStatusRow,
} from "@/lib/db/store-order-store";

export {
  CATALOG_PRODUCT_EMBED,
  fetchAllProducts,
  fetchCatalogFeaturedByCategory,
  fetchCatalogFeaturedProducts,
  fetchCatalogFromDb,
  fetchCatalogNewestProducts,
  fetchCatalogProducts,
  fetchCatalogProductsByCategory,
  fetchCatalogProductsBySlugs,
  fetchCatalogProductsShopOverview,
  fetchFeaturedByCategory,
  fetchHomeBestsellers,
  fetchHomepageProducts,
  fetchProductBySlug,
  fetchProductSlugs,
  fetchRelatedProducts,
  fetchSitemapPages,
  fetchSitemapProducts,
  loadCachedPdpDetailsBySlug,
  loadCachedPdpProductBySlug,
} from "@/lib/db/store-catalog-store";

export {
  fetchActiveCategories,
  fetchCategoryCounts,
  fetchShopTypes,
} from "@/lib/db/store-catalog-store";

export {
  fetchHero,
  fetchHeroSlides,
  fetchSiteSettings,
  fetchTestimonials,
} from "@/lib/db/store-chrome-store";

export {
  fetchBlogPosts,
  fetchPageBySlug,
  fetchPageSlugs,
} from "@/lib/db/store-content-store";

export async function fetchReviewProducts(
  includeDemo = false
): Promise<
  { _id: string; slug: string; name: string; category: string; image?: string | null }[]
> {
  return projectReviewProducts(await fetchAllProductsForReviews(includeDemo));
}

export {
  fetchApprovedReviews,
  fetchApprovedReviewStats,
  fetchCachedApprovedReviews,
  fetchCachedApprovedReviewStats,
} from "@/lib/db/store-review-store";



export {
  enqueueEmailEventRow,
  getPendingEmailEvents,
  markEmailSent,
  recentWinbackExists,
} from "@/lib/db/store-email-event-store";


export async function submitReview(
  input: StorefrontReviewInput
): Promise<StorefrontReviewResult> {
  const product = await fetchProductBySlugForReview(
    input.slug,
    Boolean(input.isDemo)
  );
  if (!product) {
    return { ok: false, error: "Product not found.", status: 404 };
  }
  return submitReviewForProduct(input, product._id);
}
