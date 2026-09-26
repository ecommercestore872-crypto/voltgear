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
import { listAdminCollections } from "@/lib/db/collection-store";

export const metadata: Metadata = {
  title: "Add product",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [shopTypes, collections] = await Promise.all([
    listAdminShopTypes().catch(() => []),
    listAdminCollections().catch(() => []),
  ]);
  const picker = collections.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    mode: c.mode,
    autoRule: c.autoRule,
    homeSlot: c.homeSlot,
  }));
  return <ProductForm shopTypes={shopTypes} collections={picker} />;
}
