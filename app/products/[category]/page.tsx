import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { GadgetShopCatalogClient } from "@/components/gadget/gadget-shop-catalog-client";
import { FALLBACK_SHOP_TYPES, findShopType } from "@/lib/categories";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { products2Href } from "@/lib/gadget-preview";
import { fetchCatalogProducts, fetchShopTypes } from "@/lib/db/store";
import { getSettings } from "@/lib/sanity/settings";
import { normalizeSettings } from "@/lib/site-config";
import type { Product } from "@/lib/types";
import {
  categoryHubCopy,
  categoryRelatedGuide,
  categorySearchMeta,
  categoryStructuredData,
  indexSiteUrl,
  storeAlternatesLanguages,
} from "@/lib/seo-rules";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const types = await fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES);
  const shop = findShopType(types.length ? types : FALLBACK_SHOP_TYPES, params.category);
  const name = shop?.name || params.category.replace(/-/g, " ");
  const meta = categorySearchMeta({
    slug: params.category,
    name,
    description: shop?.description,
  });
  return {
    title: { absolute: meta.title },
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: `/products/${params.category}`,
      languages: storeAlternatesLanguages(`/products/${params.category}`).languages,
    },
    openGraph: { title: meta.title, description: meta.description, type: "website" },
  };
}

export default async function Products2CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  let products: Product[] = [];
  let shopTypes = FALLBACK_SHOP_TYPES;
  const settings = await getSettings().catch(() => null);
  const config = normalizeSettings(settings);

  try {
    const [p, types] = await Promise.all([fetchCatalogProducts(), fetchShopTypes()]);
    products = applyGadgetStudioImagesList(p);
    shopTypes = types.length ? types : FALLBACK_SHOP_TYPES;
  } catch {
    products = [];
  }

  const shop = findShopType(shopTypes, params.category);
  if (!shop && !products.some((p) => p.category === params.category)) {
    notFound();
  }

  const title = shop?.name || params.category.replace(/-/g, " ");
  const categoryProducts = products.filter((p) => p.category === params.category);
  const hubCopy = categoryHubCopy({ slug: params.category, name: title });
  const structured = categoryStructuredData({
    siteUrl: indexSiteUrl(),
    name: title,
    path: `/products/${params.category}`,
    description: hubCopy,
    items: categoryProducts.slice(0, 20).map((product) => ({
      name: product.name,
      path: `/product/${product.slug}`,
    })),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            structured.collection,
            structured.itemList,
            structured.breadcrumb,
          ]).replace(/</g, "\\u003c"),
        }}
      />
      <Suspense fallback={<div className="min-h-[50vh] bg-[var(--g-cream)]" aria-hidden />}>
        <GadgetShopCatalogClient
          title={title}
          description={hubCopy}
          products={products}
          shopTypes={shopTypes}
          activeCategory={params.category}
          config={config}
          flattenGrid
          guideLink={categoryRelatedGuide(params.category)}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Shop", href: products2Href() },
            { label: title },
          ]}
        />
      </Suspense>
    </>
  );
}
