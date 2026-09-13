import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";
import { ChangePassword } from "@/components/admin/change-password";
import { getAdminSettings, listAdminProducts } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();
  const productsRows = await listAdminProducts();
  const products = productsRows.map(p => ({
    _id: p._id,
    name: p.name,
    slug: p.slug,
    category: p.category,
  }));
  return (
    <div className="space-y-12">
      <SettingsForm settings={settings as never} products={products} />
      <div className="mx-auto max-w-5xl border-t pt-10">
        <ChangePassword />
      </div>
    </div>
  );
}
