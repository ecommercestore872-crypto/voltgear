import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GadgetShopCatalog } from "@/components/gadget/gadget-shop-catalog";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import { getStorefrontCollectionBySlug } from "@/lib/db/collection-store";
import { fetchShopTypes } from "@/lib/db/store";
import { isDemoSession } from "@/lib/demo";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { collectionHref } from "@/lib/gadget-preview";
import { getSettings } from "@/lib/sanity/settings";
import { normalizeSettings } from "@/lib/site-config";
import { getStockState } from "@/lib/stock";
import type { Product } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const found = await getStorefrontCollectionBySlug(params.slug).catch(() => null);
  return {
    title: found?.collection.name || params.slug.replace(/-/g, " "),
  };
}

function hasImage(p: Product) {
  return Boolean(p.images?.[0] || p.cloudinaryImages?.[0]);
}

function sortProducts(list: Product[], sort: string) {
  const sorted = [...list].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name);
  });
  return [
    ...sorted.filter((p) => !getStockState(p.stockStatus).soldOut),
    ...sorted.filter((p) => getStockState(p.stockStatus).soldOut),
  ];
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { q?: string; sort?: string };
}) {
  const demo = isDemoSession();
  const settings = await getSettings().catch(() => null);
  const config = normalizeSettings(settings);
  const [found, shopTypes] = await Promise.all([
    getStorefrontCollectionBySlug(params.slug, demo).catch(() => null),
    fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES),
  ]);
  if (!found) notFound();

  const q = (searchParams.q || "").trim();
  const qLower = q.toLowerCase();
  const sort = searchParams.sort || "featured";
  let list = applyGadgetStudioImagesList(found.products).filter(hasImage);
  if (qLower) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(qLower) ||
        p.category.toLowerCase().includes(qLower) ||
        (p.shortDescription || "").toLowerCase().includes(qLower)
    );
  }

  return (
    <GadgetShopCatalog
      title={found.collection.name}
      description={
        found.collection.description ||
        "Curated picks in this collection — same layout as Best Sellers and Featured."
      }
      products={sortProducts(list, sort)}
      shopTypes={shopTypes.length ? shopTypes : FALLBACK_SHOP_TYPES}
      query={q}
      sort={sort}
      config={config}
      basePath={collectionHref(found.collection.slug)}
      flattenGrid
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: found.collection.name },
      ]}
    />
  );
}
