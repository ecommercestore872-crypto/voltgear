import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Package, Truck } from "lucide-react";
import { GadgetSupportCard, GadgetSupportLayout } from "@/components/gadget/gadget-support-layout";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import {
  cityHubDescription,
  cityHubFaqs,
  cityHubIntro,
  cityHubStructuredData,
  cityHubTitle,
  citySeoHubSlugs,
  findCitySeoHub,
} from "@/lib/city-seo";
import { fetchShopTypes } from "@/lib/db/store";
import { indexSiteUrl, storeAlternatesLanguages } from "@/lib/seo-rules";

export const revalidate = 3600;

export function generateStaticParams() {
  return citySeoHubSlugs().map((city) => ({ city }));
}

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const hub = findCitySeoHub(params.city);
  if (!hub) return { robots: { index: false, follow: false } };
  const title = cityHubTitle(hub);
  const description = cityHubDescription(hub);
  const path = `/cod/${hub.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path, languages: storeAlternatesLanguages(path).languages },
    openGraph: { title, description, type: "website", url: path },
  };
}

export default async function CityCodHubPage({ params }: { params: { city: string } }) {
  const hub = findCitySeoHub(params.city);
  if (!hub) notFound();
  const siteUrl = indexSiteUrl();
  const path = `/cod/${hub.slug}`;
  const structured = cityHubStructuredData({ siteUrl, city: hub, path });
  const faqs = cityHubFaqs(hub);
  let categories = FALLBACK_SHOP_TYPES;
  try {
    const types = await fetchShopTypes();
    if (types.length) categories = types;
  } catch { /* fallback */ }
  const topCategories = categories.filter((c) => c.active !== false).slice().sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 8);
  const jsonLd = JSON.stringify([structured.webPage, structured.faq, structured.breadcrumb]).replace(/</g, "\\u003c");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <GadgetSupportLayout
        eyebrow="Delivery"
        title={`Electronics with COD in ${hub.name}`}
        description={cityHubIntro(hub)}
        related={[
          { href: "/products", label: "All categories" },
          { href: "/shipping-returns", label: "Shipping and returns" },
          { href: "/track", label: "Track order" },
        ]}
      >
        <div className="space-y-6">
          <GadgetSupportCard icon={<Truck className="h-5 w-5" aria-hidden />} title={`How COD works in ${hub.name}`}>
            <ol className="gadget-body mt-3 list-decimal space-y-2 pl-5 text-sm sm:text-base">
              <li>Pick a category or product and add it to cart.</li>
              <li>Checkout with cash on delivery if offered for your address.</li>
              <li>Inspect the parcel when the courier arrives, then pay.</li>
            </ol>
          </GadgetSupportCard>
          <GadgetSupportCard icon={<Package className="h-5 w-5" aria-hidden />} title="Shop by category">
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {topCategories.map((cat) => (
                <li key={cat.slug}>
                  <Link href={`/products/${cat.slug}`} className="flex min-h-11 items-center rounded-xl border border-[var(--g-line)] bg-[var(--g-cream-deep)] px-4 py-2 text-sm font-medium text-[var(--g-forest)] hover:bg-[var(--g-white)]">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </GadgetSupportCard>
          <GadgetSupportCard icon={<MapPin className="h-5 w-5" aria-hidden />} title="Other cities">
            <ul className="mt-3 flex flex-wrap gap-2">
              {citySeoHubSlugs().filter((slug) => slug !== hub.slug).map((slug) => {
                const other = findCitySeoHub(slug);
                if (!other) return null;
                return (
                  <li key={slug}>
                    <Link href={`/cod/${slug}`} className="inline-flex min-h-10 items-center rounded-full border border-[var(--g-line)] bg-[var(--g-white)] px-4 text-sm font-medium">
                      {other.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </GadgetSupportCard>
          <section className="rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-5 sm:p-6">
            <h2 className="text-lg font-semibold">{`Common questions - ${hub.name}`}</h2>
            <dl className="mt-4 space-y-4">
              {faqs.map((f) => (
                <div key={f.question}>
                  <dt className="font-medium">{f.question}</dt>
                  <dd className="gadget-body mt-1 text-sm text-[var(--g-taupe)]">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </GadgetSupportLayout>
    </>
  );
}