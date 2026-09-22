import type { Metadata } from "next";

import { HomepageSectionForm } from "@/components/admin/homepage-section-form";
import { listAdminProductPickers, listAdminShopTypes } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Create Homepage Section",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewHomepageSectionPage() {
  const [shopTypes, simpleProducts] = await Promise.all([
    listAdminShopTypes(),
    listAdminProductPickers(),
  ]);

  return (
    <HomepageSectionForm
      shopTypes={shopTypes}
      availableProducts={simpleProducts}
    />
  );
}
