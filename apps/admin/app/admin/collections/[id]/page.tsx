import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionEditor } from "@/components/admin/collection-editor";
import { listAdminProductsByIds } from "@/lib/db/admin-store";
import { getAdminCollection } from "@/lib/db/collection-store";

export const metadata: Metadata = {
  title: "Edit collection",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCollectionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const collection = await getAdminCollection(params.id).catch(() => null);
  if (!collection) notFound();
  const selectedProducts = await listAdminProductsByIds(
    collection.productIds,
  ).catch(() => []);
  return (
    <CollectionEditor initial={collection} selectedProducts={selectedProducts} />
  );
}
