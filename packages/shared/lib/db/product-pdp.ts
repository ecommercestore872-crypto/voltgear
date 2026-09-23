import { cache } from "react";

import { fetchProductBySlug } from "@/lib/db/store";

/** One Supabase read per slug per server render (metadata + page share this). */
export const loadPdpProductBySlug = cache((slug: string) =>
  fetchProductBySlug(slug, false),
);