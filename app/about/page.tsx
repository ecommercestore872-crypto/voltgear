import type { Metadata } from "next";

import {
  GadgetArticleShell,
  GadgetCmsSections,
  cmsCover,
  loadCmsPage,
} from "@/components/gadget/gadget-article-shell";
import { getSettings } from "@/lib/sanity/settings";
import { normalizeSettings } from "@/lib/site-config";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadCmsPage("about");
  return {
    title: page?.seo?.title || page?.title || "About Us",
    description:
      page?.seo?.description ||
      page?.excerpt ||
      "Learn about Buy n Try — tech accessories with COD, warranty, and honest pricing.",
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const page = await loadCmsPage("about");
  const settings = await getSettings().catch(() => null);
  const brand = normalizeSettings(settings).storeName;

  return (
    <GadgetArticleShell
      eyebrow="Company"
      title={page?.title || `About ${brand}`}
      description={
        page?.excerpt ||
        `${brand} brings reliable tech accessories with cash on delivery, clear pricing, and warranty-backed support.`
      }
      coverUrl={cmsCover(page)}
      backHref="/"
      backLabel="Back to shop"
    >
      {page?.sections?.length ? (
        <GadgetCmsSections page={page} />
      ) : (
        <div className="space-y-4 text-[var(--g-taupe)]">
          <p>
            We started {brand} to make everyday tech accessories easier to buy in Pakistan —
            honest specs, COD at your door, and real people when something goes wrong.
          </p>
          <p>
            Browse curated chargers, audio, and power gear on our shop. Need help? Reach us on
            WhatsApp or the contact page — we usually reply the same day.
          </p>
        </div>
      )}
    </GadgetArticleShell>
  );
}
