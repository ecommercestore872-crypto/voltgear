import { unstable_cache } from "next/cache";

import { mapPage } from "@/lib/db/map";
import {
  db,
  demoFilter,
  execDemoQuery,
  LIVE,
} from "@/lib/db/store-query-foundation";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";
import type { Page } from "@/lib/types";

export const fetchBlogPosts = unstable_cache(
  async (includeDemo = false): Promise<Page[]> => {
    const { data, error } = await execDemoQuery(() =>
      demoFilter(
        db()
          .from("pages")
          .select("*")
          .eq("page_type", "blog")
          .eq("status", LIVE),
        includeDemo,
      ).order("published_at", { ascending: false, nullsFirst: false }),
    );
    if (error) throw error;
    return (data ?? [])
      .map((row) => mapPage(row as Record<string, unknown>))
      .filter(Boolean) as Page[];
  },
  ["fetchBlogPosts"],
  { revalidate: STOREFRONT_CATALOG_REVALIDATE },
);

export async function fetchPageBySlug(
  slug: string,
  includeDemo = false,
): Promise<Page | null> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db().from("pages").select("*").eq("slug", slug).eq("status", LIVE),
      includeDemo,
    ).maybeSingle(),
  );
  if (error) throw error;
  return mapPage(data as Record<string, unknown> | null);
}

export async function fetchPageSlugs(): Promise<{ slug: string }[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(db().from("pages").select("slug").eq("status", LIVE), false),
  );
  if (error) throw error;
  return (data ?? []).map((row) => ({ slug: String(row.slug) }));
}
