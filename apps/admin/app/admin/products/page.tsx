import type { Metadata } from "next";

import { ProductList } from "@/components/admin/product-list";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  listAdminProductCategoryCounts,
  listAdminProductsPageWithCount,
  listAdminShopTypes,
} from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Products",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminProductsPage(
  props: {
    searchParams: Promise<{
      stock?: string;
      q?: string;
      page?: string;
      category?: string;
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const q = searchParams.q?.trim() ?? "";
  const stockAttention = searchParams.stock === "attention";
  const category = searchParams.category?.trim() || undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const [result, categoryCounts, shopTypes] = await Promise.all([
    listAdminProductsPageWithCount({
      page,
      pageSize: ADMIN_PRODUCTS_PAGE_SIZE,
      q,
      category,
      stockAttention,
    }),
    listAdminProductCategoryCounts().catch(() => []),
    listAdminShopTypes().catch(() => []),
  ]);

  return (
    <ProductList
      products={result.products}
      shopTypes={shopTypes}
      stockFilter={searchParams.stock}
      serverQuery={q.length >= 2 ? q : ""}
      totalCount={result.total}
      page={result.page}
      pageSize={result.pageSize}
      serverCategory={category}
      categoryCounts={categoryCounts}
    />
  );
}
