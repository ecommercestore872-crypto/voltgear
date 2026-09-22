import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomepageSectionForm } from "@/components/admin/homepage-section-form";
import { listAdminProductsByIds, listAdminShopTypes } from "@/lib/db/admin-store";
import { getAdminHomepageSection } from "@/lib/db/homepage-sections-store";

export const metadata: Metadata = {
  title: "Edit Homepage Section",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditHomepageSectionPage({
  params,
}: {
  params: { id: string };
}) {
  const section = await getAdminHomepageSection(params.id);
  if (!section) notFound();

  const manualIds = section.manualProductIds ?? [];
  const [shopTypes, selectedProducts] = await Promise.all([
    listAdminShopTypes(),
    listAdminProductsByIds(manualIds),
  ]);

  const availableProducts = selectedProducts.map((p) => ({
    id: p._id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    price: p.price ?? 0,
  }));

  return (
    <HomepageSectionForm
      section={section}
      shopTypes={shopTypes}
      availableProducts={availableProducts}
    />
  );
}
