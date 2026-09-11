import type { Metadata } from "next";

import { BetaHomePage } from "@/components/beta/beta-home-page";
import { fetchSiteSettings } from "@/lib/db/store";
import { storeAlternatesLanguages } from "@/lib/seo-rules";
import type { SiteSettings } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  let settings: SiteSettings | null = null;
  try {
    settings = await fetchSiteSettings();
  } catch {
    settings = null;
  }
  const title =
    settings?.seo?.title ||
    "Beta | Buy n Try — Earbuds, Airbuds, Smartwatches & Chargers";
  const description =
    settings?.seo?.description ||
    "Shop earbuds, airbuds, smartwatches, power banks and chargers at Buy n Try. Cash on delivery nationwide.";
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: "/beta",
      languages: storeAlternatesLanguages("/beta").languages,
    },
    robots: { index: false, follow: false },
  };
}

export default async function BetaPage() {
  return (
    <div className="beta-enhancement-wrapper">
      <BetaHomePage />
    </div>
  );
}
