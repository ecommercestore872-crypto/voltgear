import type { Metadata } from "next";

import { HomepageSectionForm } from "@/components/admin/homepage-section-form";
import { listAdminShopTypes, listAdminProducts } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Create Homepage Section",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewHomepageSectionPage() {
  const shopTypes = await listAdminShopTypes();
  const products = await listAdminProducts();

  const simpleProducts = products.map((p) => ({
    id: p._id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    price: p.price,
  }));

  return (
    <HomepageSectionForm
      shopTypes={shopTypes}
      availableProducts={simpleProducts}
    />
  );
}
