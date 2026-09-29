import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";

const ProductForm = nextDynamic(
  () =>
    import("@/components/admin/product-form").then((m) => ({
      default: m.ProductForm,
    })),
  { loading: () => <p className="text-sm text-muted-foreground p-6">Loading editor…</p> },
);
import { getAdminProductForEditor, listAdminShopTypes } from "@/lib/db/admin-store";
import {
  listAdminCollectionPickers,
  listManualCollectionIdsForProduct,
} from "@/lib/db/collection-store";

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const [product, shopTypes, collections, collectionIds] = await Promise.all([
    getAdminProductForEditor(params.id),
    listAdminShopTypes().catch(() => []),
    listAdminCollectionPickers().catch(() => []),
    listManualCollectionIdsForProduct(params.id).catch(() => []),
  ]);
  if (!product) notFound();
  return (
    <ProductForm
      product={product}
      shopTypes={shopTypes}
      collections={collections}
      collectionIds={collectionIds}
    />
  );
}
