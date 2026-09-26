import type { Metadata } from "next";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { GadgetBuyBox } from "@/components/gadget/gadget-buy-box";
import { GadgetPdpDeferred } from "@/components/product/gadget-pdp-deferred";
import { ProductViewTracker } from "@/components/product/product-view-tracker";
import { applyGadgetStudioImages } from "@/lib/gadget-product-images";
import { products2Href } from "@/lib/gadget-preview";
import { loadPdpProductBySlug } from "@/lib/db/product-pdp";
import { fetchSiteSettings } from "@/lib/db/store";
import { normalizeSettings } from "@/lib/site-config";
import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";
import { indexSiteUrl, productStructuredData } from "@/lib/seo-rules";
import { SHOPPER_BRAND } from "@/lib/brand";

export const revalidate = STOREFRONT_CATALOG_REVALIDATE;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await loadPdpProductBySlug(params.slug).catch(() => null);
  if (!product) return { robots: { index: false, follow: false } };

  let title = `${product.name} Price in Pakistan | Buy n Try`;
  const lowerName = product.name.toLowerCase();
  if (lowerName.includes("20000mah") && lowerName.includes("power bank")) {
    title = `Best 20000mAh Power Bank Pakistan: ${product.name} | COD`;
  } else if (
    lowerName.includes("j10") ||
    (lowerName.includes("mic") && lowerName.includes("wireless"))
  ) {
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
      images: firstImg ? [{ url: firstImg }] : undefined,
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

function PdpDeferredFallback() {
  return (
    <div
      className="mt-10 min-h-[240px] animate-pulse rounded-2xl bg-[var(--g-line)]/40"
      aria-hidden
    />
  );
}

export default async function Product2Page({
  params,
}: {
  params: { slug: string };
}) {
  let product: Product | null = null;
  let settings = null;
  try {
    [product, settings] = await Promise.all([
      loadPdpProductBySlug(params.slug),
      fetchSiteSettings().catch(() => null),
    ]);
  } catch {
    product = null;
  }

  if (!product) notFound();

  product = applyGadgetStudioImages(product);
  const config = normalizeSettings(settings);

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
          text: `The ${product.name} is priced competitively at Rs. ${product.price} exclusively at Buy n Try in Pakistan.`,
        },
      },
      {
        "@type": "Question",
        name: `Can I get cash on delivery for the ${product.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes! Buy n Try offers 100% Cash on Delivery across Pakistan for the ${product.name}. You can even inspect the parcel to combat fraud.`,
        },
      },
    ],
  };

  return (
    <div className="gadget-scroll-pad-cta bg-[var(--g-cream)] text-[var(--g-charcoal)] lg:pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            productJsonLd,
            breadcrumbJsonLd,
            dynamicFaqJsonLd,
          ]).replace(/</g, "\\u003c"),
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

        <Suspense fallback={<PdpDeferredFallback />}>
          <GadgetPdpDeferred product={product} />
        </Suspense>
      </div>
    </div>
  );
}
