import { unstable_cache } from "next/cache";

import { fetchSiteSettings } from "@/lib/db/store";

export const getSettings = unstable_cache(
  async () => {
    return await fetchSiteSettings();
  },
  ["site-settings"],
  { revalidate: 60 }
);
