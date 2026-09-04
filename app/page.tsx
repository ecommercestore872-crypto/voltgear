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
  const title = settings?.seo?.title || "Buy n Try — Premium Electronics Accessories";
  const description =
    settings?.seo?.description ||
    "Shop smartwatches, power banks, chargers and earbuds. Premium electronics accessories with fast shipping.";
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
