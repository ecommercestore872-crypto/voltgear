import { cache } from "react";

import { loadCachedPdpProductBySlug } from "@/lib/db/store";

/** One cached Supabase read per slug per request (metadata + page share this). */
export const loadPdpProductBySlug = cache((slug: string) =>
  loadCachedPdpProductBySlug(slug),
);
