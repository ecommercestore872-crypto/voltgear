import type { Metadata } from "next";

import { HomeLayoutForm } from "@/components/admin/home-layout-form";
import { LifestyleShopForm } from "@/components/admin/lifestyle-shop-form";
import { getAdminSettings } from "@/lib/db/admin-store";
import { normalizeHomeSections } from "@/lib/db/home-section-rules";
import { normalizeLifestyleShop } from "@/lib/db/lifestyle-shop-rules";

export const metadata: Metadata = {
  title: "Home layout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminHomeLayoutPage() {
  const row = await getAdminSettings();
  const sections = normalizeHomeSections(row?.home_sections);
  const lifestyleShop = normalizeLifestyleShop(row?.lifestyle_shop);
  return (
    <div className="space-y-8 pb-10">
      <HomeLayoutForm initialSections={sections} />
      <div className="mx-auto max-w-2xl px-6">
        <LifestyleShopForm initial={lifestyleShop} />
      </div>
    </div>
  );
}
