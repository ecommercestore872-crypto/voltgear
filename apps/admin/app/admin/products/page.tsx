import type { Metadata } from "next";

import { ProductList } from "@/components/admin/product-list";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  countAdminProducts,
  listAdminProductCategoryCounts,
  listAdminProductsPage,
  listAdminProductsSearch,
  listAdminShopTypes,
} from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Products",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: {
    stock?: string;
    q?: string;
    page?: string;
    category?: string;
  };
}) {
  const q = searchParams.q?.trim() ?? "";
  const stockAttention = searchParams.stock === "attention";
  const category = searchParams.category?.trim() || undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  if (q.length >= 2) {
    const [products, shopTypes] = await Promise.all([
      listAdminProductsSearch(q),
      listAdminShopTypes().catch(() => []),
    ]);
    return (
      <ProductList
        products={products}
        shopTypes={shopTypes}
        stockFilter={searchParams.stock}
        serverQuery={q}
      />
    );
  }

  const [products, totalCount, categoryCounts, shopTypes] = await Promise.all([
    listAdminProductsPage({
      page,
      pageSize: ADMIN_PRODUCTS_PAGE_SIZE,
      category,
      stockAttention,
    }),
    countAdminProducts({ category, stockAttention }),
    listAdminProductCategoryCounts().catch(() => []),
    listAdminShopTypes().catch(() => []),
  ]);

  return (
    <ProductList
      products={products}
      shopTypes={shopTypes}
      stockFilter={searchParams.stock}
      totalCount={totalCount}
      page={page}
      pageSize={ADMIN_PRODUCTS_PAGE_SIZE}
      serverCategory={category}
      categoryCounts={categoryCounts}
    />
  );
}
