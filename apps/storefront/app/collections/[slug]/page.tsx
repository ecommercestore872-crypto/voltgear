import type { Metadata } from "next";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { GadgetShopCatalogClient } from "@/components/gadget/gadget-shop-catalog-client";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import { getStorefrontCollectionBySlug } from "@/lib/db/collection-store";
import { fetchShopTypes } from "@/lib/db/store";
import { loadStorefrontSettings } from "@/lib/db/storefront-shell";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { collectionHref } from "@/lib/gadget-preview";
import { normalizeSettings } from "@/lib/site-config";

export const revalidate = STOREFRONT_CATALOG_REVALIDATE;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const found = await getStorefrontCollectionBySlug(params.slug).catch(
    () => null,
  );
  const name = found?.collection.name || params.slug.replace(/-/g, " ");
  return {
    title: name,
    description: `Shop the ${name} collection at Buy n Try (buyntryy.com).`,
    alternates: { canonical: `/collections/${params.slug}` },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: { slug: string };
}) {
  const demo = false;
  const settings = await loadStorefrontSettings().catch(() => null);
  const config = normalizeSettings(settings);
  const [found, shopTypes] = await Promise.all([
    getStorefrontCollectionBySlug(params.slug, demo).catch(() => null),
    fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES),
  ]);
  if (!found) notFound();

  const products = applyGadgetStudioImagesList(found.products);

  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] bg-[var(--g-cream)]" aria-hidden />
      }
    >
      <GadgetShopCatalogClient
        title={found.collection.name}
        description={
          found.collection.description ||
          "Curated picks in this collection — same layout as Best Sellers and Featured."
        }
        products={products}
        shopTypes={shopTypes.length ? shopTypes : FALLBACK_SHOP_TYPES}
        config={config}
        basePath={collectionHref(found.collection.slug)}
        flattenGrid
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: found.collection.name },
        ]}
      />
    </Suspense>
  );
}
