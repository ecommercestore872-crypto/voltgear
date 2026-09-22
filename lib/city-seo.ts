import { SHOPPER_BRAND } from "@/lib/brand";

export type CitySeoHub = {
  slug: string;
  name: string;
  province: string;
  deliveryNote: string;
};

export const CITY_SEO_HUBS: CitySeoHub[] = [
  { slug: "lahore", name: "Lahore", province: "Punjab", deliveryNote: "Typical courier delivery in Lahore is a few business days after dispatch. Pay cash on delivery when the parcel arrives." },
  { slug: "karachi", name: "Karachi", province: "Sindh", deliveryNote: "We ship to Karachi nationwide via courier partners. Cash on delivery lets you inspect items before you pay." },
  { slug: "islamabad", name: "Islamabad", province: "Islamabad Capital Territory", deliveryNote: "Islamabad sectors receive COD parcels through nationwide couriers. Track your order after checkout." },
  { slug: "rawalpindi", name: "Rawalpindi", province: "Punjab", deliveryNote: "Rawalpindi deliveries follow the same COD flow as Lahore: order online, pay when your parcel arrives." },
];

const CITY_BY_SLUG = new Map(CITY_SEO_HUBS.map((c) => [c.slug, c]));

export function findCitySeoHub(slug: string): CitySeoHub | undefined {
  return CITY_BY_SLUG.get(slug);
}

export function citySeoHubSlugs(): string[] {
  return CITY_SEO_HUBS.map((c) => c.slug);
}

export function cityHubTitle(city: CitySeoHub): string {
  return `Electronics COD ${city.name} | Buy Online | ${SHOPPER_BRAND.spokenName}`;
}

export function cityHubDescription(city: CitySeoHub): string {
  return `Shop earbuds, smartwatches, power banks, chargers and accessories in ${city.name} with cash on delivery at ${SHOPPER_BRAND.spokenName}. Nationwide shipping from buyntryy.com.`;
}

export function cityHubIntro(city: CitySeoHub): string {
  return `${SHOPPER_BRAND.spokenName} delivers to ${city.name} and across Pakistan. Browse category pages for live prices, then checkout with cash on delivery. ${city.deliveryNote}`;
}

export function cityHubFaqs(city: CitySeoHub): { question: string; answer: string }[] {
  const brand = SHOPPER_BRAND.spokenName;
  return [
    { question: `Does ${brand} offer cash on delivery in ${city.name}?`, answer: `Yes. Eligible orders ship to ${city.name} with cash on delivery.` },
    { question: `How long does delivery take in ${city.name}?`, answer: `After dispatch, courier transit to ${city.name} usually takes a few business days.` },
    { question: `Which products can I order for ${city.name}?`, answer: `All live categories on buyntryy.com can ship to ${city.name} when COD is available at checkout.` },
  ];
}

export function cityHubStructuredData(input: { siteUrl: string; city: CitySeoHub; path: string }) {
  const pageUrl = `${input.siteUrl.replace(/\/$/, "")}${input.path}`;
  const faqs = cityHubFaqs(input.city);
  return {
    webPage: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: cityHubTitle(input.city),
      description: cityHubDescription(input.city),
      url: pageUrl,
      inLanguage: "en-PK",
      isPartOf: { "@type": "WebSite", name: SHOPPER_BRAND.spokenName, url: input.siteUrl },
    },
    faq: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: input.siteUrl },
        { "@type": "ListItem", position: 2, name: `${input.city.name} COD`, item: pageUrl },
      ],
    },
  };
}