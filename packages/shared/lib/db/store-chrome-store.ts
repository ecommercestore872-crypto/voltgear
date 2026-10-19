import { unstable_cache } from "next/cache";

import { MAX_HERO_SLIDES } from "@/lib/db/hero-slide-rules";
import {
  mapHero,
  mapHeroSlide,
  mapSettings,
  mapTestimonial,
} from "@/lib/db/map";
import {
  mapStoreProduct,
  PRODUCT_EMBED,
} from "@/lib/db/store-catalog-store";
import {
  db,
  demoFilter,
  execDemoQuery,
  LIVE,
} from "@/lib/db/store-query-foundation";
import {
  STOREFRONT_CATALOG_REVALIDATE,
  STOREFRONT_HERO_SLIDES_CACHE_TAG,
  STOREFRONT_SITE_SETTINGS_CACHE_TAG,
  STOREFRONT_TESTIMONIALS_CACHE_TAG,
} from "@/lib/storefront-cache";
import type {
  HeroSection,
  HeroSlide,
  Product,
  SiteSettings,
  Testimonial,
} from "@/lib/types";

export const fetchSiteSettings = unstable_cache(
  async (): Promise<SiteSettings | null> => {
    // Public storefront reads must not mutate CMS settings or perform setup queries.
    const { data, error } = await db()
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return mapSettings(data as Record<string, unknown> | null);
  },
  ["fetchSiteSettings"],
  {
    revalidate: STOREFRONT_CATALOG_REVALIDATE,
    tags: [STOREFRONT_SITE_SETTINGS_CACHE_TAG],
  },
);

export async function fetchHero(
  includeDemo = false,
): Promise<HeroSection | null> {
  const { data, error } = await db()
    .from("hero_sections")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data.status && data.status !== LIVE)) return null;

  let featured: Product | null = null;
  if (data.featured_product_id) {
    const { data: product } = await execDemoQuery(() =>
      demoFilter(
        db()
          .from("products")
          .select(PRODUCT_EMBED)
          .eq("id", data.featured_product_id)
          .eq("status", LIVE),
        includeDemo,
      ).maybeSingle(),
    );
    featured = product
      ? mapStoreProduct(product as Record<string, unknown>, {
          includeDemoReviews: includeDemo,
        })
      : null;
  }
  return mapHero(data as Record<string, unknown>, featured);
}

export const fetchHeroSlides = unstable_cache(
  async (includeDemo = false): Promise<HeroSlide[]> => {
    const { data, error } = await execDemoQuery(() =>
      demoFilter(
        db().from("hero_slides").select("*").eq("status", LIVE),
        includeDemo,
      )
        .order("sort_order", { ascending: true })
        .limit(MAX_HERO_SLIDES),
    );
    if (error) {
      if (error.code === "42P01" || /hero_slides/i.test(error.message ?? "")) {
        return [];
      }
      throw error;
    }
    const rows = data ?? [];
    if (rows.length === 0) return [];

    const productIds = Array.from(
      new Set(rows.map((row) => String(row.product_id)).filter(Boolean)),
    );
    const { data: products, error: productError } = await execDemoQuery(() =>
      demoFilter(
        db()
          .from("products")
          .select(PRODUCT_EMBED)
          .in("id", productIds)
          .eq("status", LIVE),
        includeDemo,
      ),
    );
    if (productError) throw productError;

    const byId = new Map<string, Product>();
    for (const row of products ?? []) {
      const mapped = mapStoreProduct(row as Record<string, unknown>, {
        includeDemoReviews: includeDemo,
      });
      if (mapped) byId.set(mapped._id, mapped);
    }

    const slides: HeroSlide[] = [];
    for (const row of rows) {
      const product = byId.get(String(row.product_id));
      if (!product || !String(row.image_url ?? "").trim()) continue;
      slides.push(mapHeroSlide(row as Record<string, unknown>, product));
    }
    return slides.slice(0, MAX_HERO_SLIDES);
  },
  ["fetchHeroSlides"],
  {
    revalidate: STOREFRONT_CATALOG_REVALIDATE,
    tags: [STOREFRONT_HERO_SLIDES_CACHE_TAG],
  },
);

export const fetchTestimonials = unstable_cache(
  async (includeDemo = false): Promise<Testimonial[]> => {
    const { data, error } = await execDemoQuery(() =>
      demoFilter(
        db().from("testimonials").select("*").eq("status", LIVE),
        includeDemo,
      )
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
    );
    if (error) throw error;
    return (data ?? []).map((row) =>
      mapTestimonial(row as Record<string, unknown>),
    );
  },
  ["fetchTestimonials"],
  {
    revalidate: STOREFRONT_CATALOG_REVALIDATE,
    tags: [STOREFRONT_TESTIMONIALS_CACHE_TAG],
  },
);
