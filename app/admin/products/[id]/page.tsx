import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { getAdminProduct, listAdminShopTypes } from "@/lib/db/admin-store";
import { membershipIdsForProduct } from "@/lib/db/collection-rules";
import { listAdminCollections } from "@/lib/db/collection-store";

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [product, shopTypes, collections] = await Promise.all([
    getAdminProduct(params.id),
    listAdminShopTypes().catch(() => []),
    listAdminCollections().catch(() => []),
  ]);
  if (!product) notFound();
  const picker = collections.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    mode: c.mode,
    autoRule: c.autoRule,
    homeSlot: c.homeSlot,
  }));
  return (
    <ProductForm
      product={product}
      shopTypes={shopTypes}
      collections={picker}
      collectionIds={membershipIdsForProduct(collections, product._id)}
    />
  );
}
