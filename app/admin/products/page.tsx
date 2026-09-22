import type { Metadata } from "next";

import { ProductList } from "@/components/admin/product-list";
import {
  listAdminProducts,
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
  searchParams: { stock?: string; q?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const [products, shopTypes] = await Promise.all([
    q.length >= 2 ? listAdminProductsSearch(q) : listAdminProducts(),
    listAdminShopTypes().catch(() => []),
  ]);
  return (
    <ProductList
      products={products}
      shopTypes={shopTypes}
      stockFilter={searchParams.stock}
      serverQuery={q.length >= 2 ? q : undefined}
    />
  );
}
