import { absoluteUrl, indexSiteUrl } from "@/lib/seo-rules";

/** Home > page breadcrumb markup for top-level info pages. */
export function BreadcrumbJsonLd({ name, path }: { name: string; path: string }) {
  const siteUrl = indexSiteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name, item: absoluteUrl(path, siteUrl) },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
