import { cache } from "react";

import {
  loadCachedPdpDetailsBySlug,
  loadCachedPdpProductBySlug,
} from "@/lib/db/store";

/** One cached Supabase read per slug per request (metadata + page share this). */
export const loadPdpProductBySlug = cache((slug: string) =>
  loadCachedPdpProductBySlug(slug),
);

/** Long-form copy for tabs — streamed below the fold. */
export const loadPdpProductDetailsBySlug = cache((slug: string) =>
  loadCachedPdpDetailsBySlug(slug),
);
