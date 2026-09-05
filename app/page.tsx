import type { Metadata } from "next";

import { GadgetHomePage } from "@/components/gadget/gadget-home-page";
import { fetchSiteSettings } from "@/lib/db/store";
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
    "Buy n Try — Earbuds, Airbuds, Smartwatches & Chargers in Pakistan";
  const description =
    settings?.seo?.description ||
    "Shop earbuds, airbuds, smartwatches, power banks and chargers at Buy n Try (buyntryy.com). Cash on delivery nationwide.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function HomePage() {
  return <GadgetHomePage />;
}
