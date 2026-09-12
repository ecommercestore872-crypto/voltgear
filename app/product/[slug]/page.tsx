import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GadgetBuyBox } from "@/components/gadget/gadget-buy-box";
import { GadgetDealPair } from "@/components/gadget/gadget-deal-pair";
import { GadgetProductCard } from "@/components/gadget/gadget-product-card";
import { GadgetProductTabs } from "@/components/gadget/gadget-product-tabs";
import { ReviewsSection } from "@/components/product/product-info-sections";
import { ProductViewTracker } from "@/components/product/product-view-tracker";
import {
  applyGadgetStudioImages,
  applyGadgetStudioImagesList,
} from "@/lib/gadget-product-images";
import { products2Href } from "@/lib/gadget-preview";
import {
  fetchApprovedReviews,
  fetchCatalogProducts,
  fetchProductBySlug,
  fetchSiteSettings,
} from "@/lib/db/store";
import { publicDealsForSlug } from "@/lib/db/deal-rules";
import { fetchDealCatalog, listProductDeals } from "@/lib/db/deal-store";
import { normalizeSettings } from "@/lib/site-config";
import { imageUrl } from "@/lib/sanity/image";
import type { Product, ProductReview } from "@/lib/types";
import { indexSiteUrl, productStructuredData } from "@/lib/seo-rules";
import { SHOPPER_BRAND } from "@/lib/brand";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await fetchProductBySlug(params.slug, false).catch(
    () => null,
  );
  if (!product) return { robots: { index: false, follow: false } };

  let title = `${product.name} Price in Pakistan | Buy n Try`;
  const lowerName = product.name.toLowerCase();
  if (lowerName.includes("20000mah") && lowerName.includes("power bank")) {
    title = `Best 20000mAh Power Bank Pakistan: ${product.name} | COD`;
  } else if (lowerName.includes("j10") || (lowerName.includes("mic") && lowerName.includes("wireless"))) {
    title = `${product.name} Wireless Mic Price in Pakistan | Buy n Try`;
  } else if (lowerName.includes("smartwatch") || lowerName.includes("watch")) {
    title = `${product.name} Price in Pakistan | Smartwatches at Buy n Try`;
  }

  const description = product.shortDescription
    ? `${product.shortDescription} Check the latest ${product.name} price in Pakistan. Fast shipping with Cash on Delivery from Buy n Try!`
    : `Find the exact ${product.name} price in Pakistan online. Read genuine reviews, compare specs, and buy with Cash on Delivery nationwide at Buy n Try.`;
  const siteUrl = indexSiteUrl();
  const url = `${siteUrl}/product/${product.slug}`;
  const firstImg = product.images?.[0]
    ? imageUrl(product.images[0], { w: 800 })
    : undefined;

  return {
    title: { absolute: title },
    description,
    keywords: [
      product.name,
      `${product.name} price in Pakistan`,
      `${product.category} in Pakistan`,
      "buy online Pakistan",
      "Buy n Try",
      "buyntryy",
      "cash on delivery",
      "J10 wireless mic price in Pakistan",
      "best 20000mah power bank Pakistan",
      "smartwatch under 5000 Pakistan",
    ],
    openGraph: {
      type: "website",
      title,
      description,
      url,
      images: firstImg ? [{ url: firstImg, alt: product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: firstImg ? [firstImg] : undefined,
    },
    alternates: {
      canonical: url,
      languages: {
        "en-PK": url,
        "x-default": url,
      },
    },
  };
}

export default async function Product2Page({
  params,
}: {
  params: { slug: string };
}) {
  let product: Product | null = null;
  let related: Product[] = [];
  let settings = null;
  let approvedReviews: ProductReview[] = [];
  let deals: Awaited<ReturnType<typeof listProductDeals>> = [];
  let dealCatalog: Awaited<ReturnType<typeof fetchDealCatalog>> = [];
  try {
    product = await fetchProductBySlug(params.slug, false);
    if (product) {
      [related, settings, approvedReviews, deals, dealCatalog] =
        await Promise.all([
          fetchCatalogProducts(),
          fetchSiteSettings().catch(() => null),
          fetchApprovedReviews(product._id, false),
          listProductDeals().catch(() => []),
          fetchDealCatalog().catch(() => []),
        ]);
    }
  } catch {
    product = null;
  }

  if (!product) notFound();

  // Deduplicate: avoid showing the same review twice when it appears
  // in both the Supabase product_reviews table and the legacy product.reviews array.
  const seen = new Set<string>();
  const mergedReviews = [...approvedReviews, ...(product.reviews ?? [])].filter(
    (r) => {
      const key = `${(r.name ?? "").toLowerCase().trim()}|${(r.comment ?? "").toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
  );
  const productWithReviews: Product = mergedReviews.length
    ? {
        ...product,
        reviews: mergedReviews,
        reviewCount:
          (product.reviewCount ?? 0) +
          (approvedReviews.length ? approvedReviews.length : 0),
      }
    : product;

  product = applyGadgetStudioImages(productWithReviews);
  related = applyGadgetStudioImagesList(related);

  const config = normalizeSettings(settings);
  const relatedProducts = related
    .filter((p) => p._id !== product._id && p.category === product.category)
    .slice(0, 4);
  const pairBlocks = publicDealsForSlug(product.slug, deals, dealCatalog)
    .map((row) => ({
      percentOff: row.percentOff,
      other: related.find((p) => p.slug === row.otherSlug) ?? null,
    }))
    .filter((row): row is { percentOff: number; other: Product } =>
      Boolean(row.other),
    )
    .slice(0, 2);

  const siteUrl = indexSiteUrl();
  const productImg = product.images?.[0]
    ? imageUrl(product.images[0], { w: 800 })
    : undefined;

  const prodDesc =
    product.shortDescription || `Buy ${product.name} in Pakistan at Buy n Try.`;

  const productJsonLd = productStructuredData({
    name: product.name,
    description: prodDesc,
    url: `${siteUrl}/product/${product.slug}`,
    image: productImg,
    category: product.category,
    price: product.price,
    currency: config.currency || "PKR",
    inStock: product.stockStatus !== "out-of-stock",
    sku: product.sku,
    brandName: SHOPPER_BRAND.spokenName,
    rating: product.rating,
    reviewCount: product.reviewCount,
    shippingFee: config.shippingFee,
    returnDays: config.returnWindowDays ?? undefined,
  });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category,
        item: `${siteUrl}${products2Href(product.category)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${siteUrl}/product/${product.slug}`,
      },
    ],
  };

  const dynamicFaqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What is the price of ${product.name} in Pakistan?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `The ${product.name} is priced competitively at Rs. ${product.price} exclusively at Buy n Try in Pakistan.`
        }
      },
      {
        "@type": "Question",
        name: `Can I get cash on delivery for the ${product.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes! Buy n Try offers 100% Cash on Delivery across Pakistan for the ${product.name}. You can even inspect the parcel to combat fraud.`
        }
      }
    ]
  };

  return (
    <div className="gadget-scroll-pad-cta bg-[var(--g-cream)] text-[var(--g-charcoal)] lg:pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([productJsonLd, breadcrumbJsonLd, dynamicFaqJsonLd]).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
      <ProductViewTracker
        slug={product.slug}
        name={product.name}
        price={product.price}
        image={
          product.images?.[0]
            ? imageUrl(product.images[0], { w: 128 })
            : undefined
        }
        category={product.category}
        productId={product._id}
        sku={product.sku}
      />
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-10">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1 text-xs text-[var(--g-taupe)]"
        >
          <Link href="/" className="hover:text-[var(--g-forest)]">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link
            href={products2Href(product.category)}
            className="capitalize hover:text-[var(--g-forest)]"
          >
            {product.category.replace(/-/g, " ")}
          </Link>
          <span aria-hidden>/</span>
          <span className="line-clamp-1 text-[var(--g-charcoal)]">
            {product.name}
          </span>
        </nav>

        <div className="mt-6">
          <GadgetBuyBox product={product} config={config} />
        </div>
        {pairBlocks.map((row) => (
          <GadgetDealPair
            key={row.other.slug}
            percentOff={row.percentOff}
            other={row.other}
          />
        ))}
        <div className="mt-10">
          <GadgetProductTabs product={product} />
        </div>

        <div className="mt-12">
          <ReviewsSection
            product={product}
            reviews={product.reviews ?? []}
            rating={product.rating}
            includeDemo={false}
          />
        </div>

        {relatedProducts.length ? (
          <section className="mt-14 pb-4">
            <div className="mb-6 flex items-end justify-between gap-3">
              <h2 className="gadget-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                You may also like
              </h2>
              <Link
                href={products2Href(product.category)}
                className="text-sm font-medium text-[var(--g-sage)] hover:text-[var(--g-forest)]"
              >
                View all
              </Link>
            </div>
            <div className="gadget-product-grid">
              {relatedProducts.map((p) => (
                <GadgetProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
