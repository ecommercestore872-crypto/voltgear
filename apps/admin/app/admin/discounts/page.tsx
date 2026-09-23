import type { Metadata } from "next";

import { PromosManager } from "@/components/admin/promos-manager";

export const metadata: Metadata = {
  title: "Discounts",
  robots: { index: false, follow: false },
};

export default function AdminDiscountsPage() {
  return <PromosManager />;
}
