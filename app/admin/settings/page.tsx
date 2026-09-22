import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";
import { ChangePassword } from "@/components/admin/change-password";
import {
  getAdminSettings,
  listAdminProductsSearch,
  listAdminShopTypes,
} from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function featuredSlugFromSettings(
  settings: Record<string, unknown> | null,
): string {
  if (!settings) return "";
  const draft =
    settings.draft && typeof settings.draft === "object"
      ? (settings.draft as Record<string, unknown>)
      : null;
  return String(
    draft?.homeFeaturedProductSlug ?? settings.home_featured_product_slug ?? "",
  ).trim();
}

export default async function AdminSettingsPage() {
  const [settings, shopTypes] = await Promise.all([
    getAdminSettings(),
    listAdminShopTypes(),
  ]);

  const slug = featuredSlugFromSettings(settings as Record<string, unknown> | null);
  let initialFeaturedProduct: {
    _id: string;
    name: string;
    slug: string;
    category: string;
  } | null = null;
  if (slug) {
    const hits = await listAdminProductsSearch(slug);
    const match = hits.find((p) => p.slug === slug) ?? hits[0];
    if (match) {
      initialFeaturedProduct = {
        _id: match._id,
        name: match.name,
        slug: match.slug,
        category: match.category,
      };
    }
  }

  const shopCategories = shopTypes.map((t) => ({
    slug: t.slug,
    name: t.name,
  }));

  return (
    <div className="space-y-12">
      <SettingsForm
        settings={settings as never}
        shopCategories={shopCategories}
        initialFeaturedProduct={initialFeaturedProduct}
      />
      <div className="mx-auto max-w-5xl border-t pt-10">
        <ChangePassword />
      </div>
    </div>
  );
}
