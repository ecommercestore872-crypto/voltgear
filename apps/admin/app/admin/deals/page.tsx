import type { Metadata } from "next";

import { DealsManager } from "@/components/admin/deals-manager";

export const metadata: Metadata = {
  title: "Deals",
  robots: { index: false, follow: false },
};

export default function AdminDealsPage() {
  return <DealsManager />;
}
