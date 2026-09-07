import type { Metadata } from "next";
import { Suspense } from "react";

import { GadgetShopCatalogClient } from "@/components/gadget/gadget-shop-catalog-client";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import {
  fetchCatalogProducts,
  fetchShopTypes,
} from "@/lib/db/store";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { getSettings } from "@/lib/sanity/settings";
import { shopCatalogSearchMeta, storeAlternatesLanguages } from "@/lib/seo-rules";
import { normalizeSettings } from "@/lib/site-config";
import type { Product } from "@/lib/types";

export const revalidate = 60;

const shopMeta = shopCatalogSearchMeta();

export const metadata: Metadata = {
  title: { absolute: shopMeta.title },
  description: shopMeta.description,
  keywords: shopMeta.keywords,
  alternates: {
    canonical: "/products",
    languages: storeAlternatesLanguages("/products").languages,
  },
  openGraph: {
    title: shopMeta.title,
    description: shopMeta.description,
    type: "website",
  },
};

export default async function Products2Page() {
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

  return (
    <Suspense fallback={<div className="min-h-[50vh] bg-[var(--g-cream)]" aria-hidden />}>
      <GadgetShopCatalogClient
        title="Shop electronics in Pakistan"
        description={shopMeta.description}
        products={products}
        shopTypes={shopTypes}
        config={config}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "All products" },
        ]}
        maxPerCategory={8}
      />
    </Suspense>
  );
}
