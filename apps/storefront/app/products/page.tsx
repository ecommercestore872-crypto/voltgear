import type { Metadata } from "next";
import { Suspense } from "react";

import { GadgetShopCatalogClient } from "@/components/gadget/gadget-shop-catalog-client";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import {
  fetchCatalogProductsShopOverview,
  fetchShopTypes,
} from "@/lib/db/store";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { loadStorefrontSettings } from "@/lib/db/storefront-shell";
import {
  shopCatalogSearchMeta,
  storeAlternatesLanguages,
} from "@/lib/seo-rules";
import { normalizeSettings } from "@/lib/site-config";
import { localCatalogPreviewEnabled } from "@/lib/local-catalog-preview";
import type { Product } from "@/lib/types";

export const revalidate = 300;

const shopMeta = shopCatalogSearchMeta();
const catalogDescription = "Explore earbuds, chargers, power banks, smartwatches and accessories at Buy N Try.";

export const metadata: Metadata = {
  title: { absolute: shopMeta.title },
  description: catalogDescription,
  keywords: shopMeta.keywords,
  alternates: {
    canonical: "/products",
    languages: storeAlternatesLanguages("/products").languages,
  },
  openGraph: {
    title: shopMeta.title,
    description: catalogDescription,
    type: "website",
  },
};

export default async function Products2Page() {
  let products: Product[] = [];
  let shopTypes = FALLBACK_SHOP_TYPES;
  const preview = localCatalogPreviewEnabled();
  const settings = preview ? null : await loadStorefrontSettings().catch(() => null);
  const config = normalizeSettings(settings);

  const [p, types] = await Promise.all([
    fetchCatalogProductsShopOverview(16).catch(() => [] as Product[]),
    preview ? Promise.resolve(FALLBACK_SHOP_TYPES) : fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES),
  ]);
  products = applyGadgetStudioImagesList(p);
  shopTypes = types.length ? types : FALLBACK_SHOP_TYPES;

  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] bg-[var(--g-cream)]" aria-hidden />
      }
    >
      <GadgetShopCatalogClient
        title="Shop electronics in Pakistan"
        description={catalogDescription}
        products={products}
        shopTypes={shopTypes}
        config={config}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "All products" }]}
        maxPerCategory={8}
      />
    </Suspense>
  );
}
