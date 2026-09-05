import type { Metadata } from "next";

import { GadgetShopCatalog } from "@/components/gadget/gadget-shop-catalog";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import {
  fetchAllProducts,
  fetchShopTypes,
} from "@/lib/db/store";
import { isDemoSession } from "@/lib/demo";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { getSettings } from "@/lib/sanity/settings";
import { normalizeSettings } from "@/lib/site-config";
import { getStockState } from "@/lib/stock";
import type { Product } from "@/lib/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop electronics accessories in Pakistan | Buy n Try",
  description:
    "Shop smartwatches, earbuds and airbuds, power banks, chargers, tripods, and more at Buy n Try (buyntryy.com). Cash on delivery nationwide.",
  alternates: { canonical: "/products" },
};

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

export default async function Products2Page({
  searchParams,
}: {
  searchParams: { q?: string; sort?: string };
}) {
  const demo = isDemoSession();
  let products: Product[] = [];
  let shopTypes = FALLBACK_SHOP_TYPES;
  const settings = await getSettings().catch(() => null);
  const config = normalizeSettings(settings);

  try {
    const [p, types] = await Promise.all([fetchAllProducts(demo), fetchShopTypes()]);
    products = applyGadgetStudioImagesList(p);
    shopTypes = types.length ? types : FALLBACK_SHOP_TYPES;
  } catch {
    products = [];
  }

  const q = (searchParams.q || "").trim();
  const qLower = q.toLowerCase();
  let list = products.filter((p) => hasImage(p));
  if (qLower) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(qLower) ||
        p.category.toLowerCase().includes(qLower) ||
        (p.shortDescription || "").toLowerCase().includes(qLower)
    );
  }

  const sort = searchParams.sort || "featured";
  const inStockFirst = sortProducts(list, sort);

  return (
    <GadgetShopCatalog
      title="Shop all"
      description="Curated tech with COD, clear pricing, and warranty-backed picks — find it fast and buy in a few taps."
      products={inStockFirst}
      shopTypes={shopTypes}
      query={q}
      sort={sort}
      config={config}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "All products" },
      ]}
    />
  );
}
