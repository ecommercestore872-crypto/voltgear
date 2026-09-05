import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GadgetShopCatalog } from "@/components/gadget/gadget-shop-catalog";
import { FALLBACK_SHOP_TYPES, findShopType } from "@/lib/categories";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { products2Href } from "@/lib/gadget-preview";
import { fetchAllProducts, fetchShopTypes } from "@/lib/db/store";
import { isDemoSession } from "@/lib/demo";
import { getSettings } from "@/lib/sanity/settings";
import { normalizeSettings } from "@/lib/site-config";
import { getStockState } from "@/lib/stock";
import type { Product } from "@/lib/types";
import { categorySearchMeta, categoryStructuredData, indexSiteUrl } from "@/lib/seo-rules";

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
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: { canonical: `/products/${params.category}` },
    openGraph: { title: meta.title, description: meta.description, type: "website" },
  };
}

function hasImage(p: Product) {
  return Boolean(p.images?.[0] || p.cloudinaryImages?.[0]);
}

function sortProducts(list: Product[], sort: string) {
  const sorted = [...list].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return (
      Number(!getStockState(a.stockStatus).soldOut) -
        Number(!getStockState(b.stockStatus).soldOut) ||
      Number(b.featured) - Number(a.featured)
    );
  });
  return sorted;
}

export default async function Products2CategoryPage({
  params,
  searchParams,
}: {
  params: { category: string };
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

  const shop = findShopType(shopTypes, params.category);
  if (!shop && !products.some((p) => p.category === params.category)) {
    notFound();
  }

  const title = shop?.name || params.category.replace(/-/g, " ");
  const description = shop?.description || "Curated picks in this category.";

  const q = (searchParams.q || "").trim();
  const qLower = q.toLowerCase();
  const sort = searchParams.sort || "featured";

  let list = products.filter((p) => p.category === params.category && hasImage(p));
  if (qLower) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(qLower) ||
        (p.shortDescription || "").toLowerCase().includes(qLower)
    );
  }

  const sorted = sortProducts(list, sort);
  const seo = categorySearchMeta({
    slug: params.category,
    name: title,
    description,
  });
  const structured = categoryStructuredData({
    siteUrl: indexSiteUrl(),
    name: title,
    path: `/products/${params.category}`,
    items: sorted.slice(0, 20).map((product) => ({
      name: product.name,
      path: `/product/${product.slug}`,
    })),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([structured.collection, structured.itemList, structured.breadcrumb]),
        }}
      />
      <GadgetShopCatalog
        title={title}
        description={seo.description}
        products={sorted}
        shopTypes={shopTypes}
        activeCategory={params.category}
        query={q}
        sort={sort}
        config={config}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: products2Href() },
          { label: title },
        ]}
      />
    </>
  );
}
