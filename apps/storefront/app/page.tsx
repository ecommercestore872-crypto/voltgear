import type { Metadata } from "next";

import { GadgetHomePage } from "@/components/gadget/gadget-home-page";
import { loadStorefrontSettings } from "@/lib/db/storefront-shell";
import { storeAlternatesLanguages } from "@/lib/seo-rules";
import type { SiteSettings } from "@/lib/types";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  let settings: SiteSettings | null = null;
  try {
    settings = await loadStorefrontSettings();
  } catch {
    settings = null;
  }
  const title =
    settings?.seo?.title ||
    "Buy n Try — Earbuds, Airbuds, Smartwatches & Chargers in Pakistan";
  const description =
    settings?.seo?.description ||
    "Explore earbuds, smartwatches, power banks and chargers at Buy n Try. View product details and current listed prices.";
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: "/",
      languages: storeAlternatesLanguages("/").languages,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: "https://buyntryy.com/",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function HomePage() {
  return <GadgetHomePage />;
}
