export {
  createAdminShopType,
  deleteAdminShopType,
  ensureFallbackShopTypes,
  getAdminShopType,
  listAdminShopTypes,
  saveAdminShopType,
} from "@/lib/db/admin-category-store";

export {
  ADMIN_PRODUCTS_PAGE_SIZE,
  countAdminProducts,
  countPendingReviewSubmissions,
  editorDocument,
  fetchAdminDashboardCatalogMetrics,
  getAdminProduct,
  getAdminProductForEditor,
  listAdminProductCategoryCounts,
  listAdminProductPickers,
  listAdminProducts,
  listAdminProductsByIds,
  listAdminProductsForDashboard,
  listAdminProductsLite,
  listAdminProductsPage,
  listAdminProductsSearch,
  productToDocument,
} from "@/lib/db/admin-product-read-store";
export type {
  AdminDashboardCatalogMetrics,
  AdminProductDashboardRow,
  AdminProductPickerRow,
} from "@/lib/db/admin-product-read-store";

export {
  createAdminProduct,
  deleteAdminProduct,
  discardAdminProductDraft,
  publishAdminProduct,
  saveAdminProduct,
  unpublishAdminProduct,
} from "@/lib/db/admin-product-write-store";

export {
  createAdminPage,
  deleteAdminPage,
  discardAdminPageDraft,
  getAdminPage,
  listAdminPages,
  listAdminPagesIndex,
  publishAdminPage,
  saveAdminPage,
  unpublishAdminPage,
} from "@/lib/db/admin-page-store";

export {
  createAdminHeroSlide,
  deleteAdminHeroSlide,
  discardAdminHeroDraft,
  getAdminHero,
  getHomePublishBlockers,
  listAdminHeroSlides,
  publishAdminHero,
  publishAdminHeroSlide,
  reorderAdminHeroSlides,
  saveAdminHero,
  unpublishAdminHero,
  unpublishAdminHeroSlide,
  updateAdminHeroSlide,
} from "@/lib/db/admin-hero-store";
export type { HeroSlideDoc } from "@/lib/db/admin-hero-store";

export {
  discardAdminEmailSenders,
  discardAdminInvoiceTemplate,
  discardAdminOrderEmails,
  discardAdminSettingsDraft,
  editorEmailSenders,
  editorInvoiceTemplate,
  editorOrderEmails,
  ensureShopperBrandSettings,
  getAdminSettings,
  getAdminSettingsForUpdate,
  publishAdminEmailSenders,
  publishAdminInvoiceTemplate,
  publishAdminOrderEmails,
  publishAdminSettings,
  saveAdminEmailSenders,
  saveAdminHomeSections,
  saveAdminInvoiceTemplate,
  saveAdminLifestyleShop,
  saveAdminOrderEmails,
  saveAdminSettings,
} from "@/lib/db/admin-settings-store";

export {
  createAdminTestimonial,
  deleteAdminTestimonial,
  deleteReview,
  discardAdminTestimonialDraft,
  getAdminTestimonial,
  listAdminTestimonials,
  listPendingReviewSubmissions,
  listReviewSubmissions,
  moderateReview,
  publishAdminTestimonial,
  saveAdminTestimonial,
  unpublishAdminTestimonial,
} from "@/lib/db/admin-review-store";

export { purgeDemoData } from "@/lib/db/admin-demo-store";
export type { DemoPurgeResult } from "@/lib/db/admin-demo-store";
