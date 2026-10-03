import { unstable_cache } from "next/cache";

import { fetchSiteSettings } from "@/lib/db/store";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";

export const getSettings = unstable_cache(
  async () => {
    return await fetchSiteSettings();
  },
  ["site-settings"],
  { revalidate: STOREFRONT_CATALOG_REVALIDATE },
);
