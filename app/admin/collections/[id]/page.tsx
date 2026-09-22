import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionEditor } from "@/components/admin/collection-editor";
import { listAdminProductsLite } from "@/lib/db/admin-store";
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
  const [collection, products] = await Promise.all([
    getAdminCollection(params.id).catch(() => null),
    listAdminProductsLite().catch(() => []),
  ]);
  if (!collection) notFound();
  return <CollectionEditor initial={collection} products={products} />;
}
