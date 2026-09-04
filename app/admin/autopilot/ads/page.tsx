import type { Metadata } from "next";

import { AutopilotCatalogFacts } from "@/components/admin/autopilot-catalog-facts";
import { catalogFacts } from "@/lib/autopilot/honesty-rules";
import { listAdminProducts } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Catalog facts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AutopilotAdsPage() {
  try {
    const products = await listAdminProducts();
    return (
      <AutopilotCatalogFacts
        products={catalogFacts(
          products.map((p) => ({
            id: p._id,
            name: p.name,
            price: p.price,
            quantity: p.quantity,
            status: p.status,
            isDemo: p.isDemo,
          }))
        )}
      />
    );
  } catch {
    return <AutopilotCatalogFacts products={[]} error />;
  }
}
