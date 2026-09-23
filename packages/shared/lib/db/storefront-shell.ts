import { cache } from "react";

import { fetchShopTypes, fetchSiteSettings } from "@/lib/db/store";

/** One settings read per RSC render (root layout + homepage share this). */
export const loadStorefrontSettings = cache(() => fetchSiteSettings());

/** One shop-types read per RSC render (root layout + homepage share this). */
export const loadStorefrontShopTypes = cache(() => fetchShopTypes());