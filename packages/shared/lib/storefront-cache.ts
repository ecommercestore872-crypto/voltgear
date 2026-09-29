/** ISR TTLs tuned to cut Vercel Fluid CPU while admin publish still on-demand revalidates. */
export const STOREFRONT_CATALOG_REVALIDATE = 300;
export const STOREFRONT_LEGAL_REVALIDATE = 3600;

/** `unstable_cache` tags — bust via shop `/api/revalidate` `{ tags: [...] }` after admin merchandising writes. */
export const STOREFRONT_SHOP_TYPES_CACHE_TAG = "storefront-shop-types";
export const STOREFRONT_HOMEPAGE_CATALOG_CACHE_TAG = "storefront-homepage-catalog";
export const STOREFRONT_HOME_SLOTS_CACHE_TAG = "storefront-home-slots";
export const STOREFRONT_CATALOG_GRID_CACHE_TAG = "storefront-catalog-grid";
export const STOREFRONT_EXTRA_RAILS_CACHE_TAG = "storefront-extra-rails";
export const STOREFRONT_SITE_SETTINGS_CACHE_TAG = "storefront-site-settings";
export const STOREFRONT_HERO_SLIDES_CACHE_TAG = "storefront-hero-slides";
export const STOREFRONT_TESTIMONIALS_CACHE_TAG = "storefront-testimonials";

/** Single bust list for category, product, collection, and home layout saves. */
export const STOREFRONT_MERCHANDISING_CACHE_TAGS = [
  STOREFRONT_SHOP_TYPES_CACHE_TAG,
  STOREFRONT_HOMEPAGE_CATALOG_CACHE_TAG,
  STOREFRONT_HOME_SLOTS_CACHE_TAG,
  STOREFRONT_CATALOG_GRID_CACHE_TAG,
  STOREFRONT_EXTRA_RAILS_CACHE_TAG,
  STOREFRONT_SITE_SETTINGS_CACHE_TAG,
  STOREFRONT_HERO_SLIDES_CACHE_TAG,
  STOREFRONT_TESTIMONIALS_CACHE_TAG,
] as const;
