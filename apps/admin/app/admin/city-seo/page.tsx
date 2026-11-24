import type { Metadata } from "next";

import { CityIntroForm } from "@/components/admin/city-intro-form";
import { CITY_SEO_HUBS } from "@/lib/city-seo";
import { fetchCityIntros } from "@/lib/db/city-seo-store";

export const metadata: Metadata = {
  title: "City page intros | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCitySeoPage() {
  const intros = await fetchCityIntros().catch(() => ({}) as Record<string, string>);
  return (
    <CityIntroForm
      cities={CITY_SEO_HUBS.map((c) => ({ slug: c.slug, name: c.name }))}
      initial={intros}
    />
  );
}
