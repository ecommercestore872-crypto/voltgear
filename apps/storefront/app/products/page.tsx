import type { Metadata } from "next";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";

import { GadgetShopCatalog } from "@/components/gadget/gadget-shop-catalog";
import { GadgetShopCatalogClient } from "@/components/gadget/gadget-shop-catalog-client";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import {
  fetchCatalogProductsShopOverview,
  fetchShopTypes,
} from "@/lib/db/store";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { loadStorefrontSettings } from "@/lib/db/storefront-shell";
import { sortCatalogProducts, toRailProduct } from "@/lib/rail-product";
import {
  shopCatalogSearchMeta,
  storeAlternatesLanguages,
} from "@/lib/seo-rules";
import { normalizeSettings } from "@/lib/site-config";
import type { Product } from "@/lib/types";

export const revalidate = STOREFRONT_CATALOG_REVALIDATE;

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
  const settings = await loadStorefrontSettings().catch(() => null);
  const config = normalizeSettings(settings);

  try {
    const [p, types] = await Promise.all([
      fetchCatalogProductsShopOverview(2),
      fetchShopTypes(),
    ]);
    products = applyGadgetStudioImagesList(p).map(toRailProduct);
    shopTypes = types.length ? types : FALLBACK_SHOP_TYPES;
  } catch {
    products = [];
  }

  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "All products" }];
  const defaultProducts = sortCatalogProducts(
    products.filter((p) => Boolean(p.images?.[0] || p.cloudinaryImages?.[0])),
    "featured",
  );

  return (
    <GadgetShopCatalogClient
      title="Shop electronics in Pakistan"
      description={shopMeta.description}
      products={products}
      shopTypes={shopTypes}
      config={config}
      breadcrumbs={breadcrumbs}
      maxPerCategory={1}
    >
      <GadgetShopCatalog
        title="Shop electronics in Pakistan"
        description={shopMeta.description}
        products={defaultProducts}
        shopTypes={shopTypes}
        query=""
        sort="featured"
        config={config}
        breadcrumbs={breadcrumbs}
        maxPerCategory={1}
      />
    </GadgetShopCatalogClient>
  );
}
