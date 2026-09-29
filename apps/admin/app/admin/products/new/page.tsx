import type { Metadata } from "next";

import nextDynamic from "next/dynamic";

const ProductForm = nextDynamic(
  () =>
    import("@/components/admin/product-form").then((m) => ({
      default: m.ProductForm,
    })),
  { loading: () => <p className="text-sm text-muted-foreground p-6">Loading editor…</p> },
);
import { listAdminShopTypes } from "@/lib/db/admin-store";
import { listAdminCollectionPickers } from "@/lib/db/collection-store";

export const metadata: Metadata = {
  title: "Add product",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [shopTypes, collections] = await Promise.all([
    listAdminShopTypes().catch(() => []),
    listAdminCollectionPickers().catch(() => []),
  ]);
  return <ProductForm shopTypes={shopTypes} collections={collections} />;
}
