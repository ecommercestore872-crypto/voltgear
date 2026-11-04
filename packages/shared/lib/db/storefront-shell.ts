import { cache } from "react";

import { fetchShopTypes, fetchSiteSettings } from "@/lib/db/store";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import { localCatalogPreviewEnabled } from "@/lib/local-catalog-preview";

/** One settings read per RSC render (root layout + homepage share this). */
export const loadStorefrontSettings = cache(() =>
  localCatalogPreviewEnabled() ? Promise.resolve(null) : fetchSiteSettings(),
);

/** One shop-types read per RSC render (root layout + homepage share this). */
export const loadStorefrontShopTypes = cache(() =>
  localCatalogPreviewEnabled()
    ? Promise.resolve(FALLBACK_SHOP_TYPES)
    : fetchShopTypes(),
);
