import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";

import { GadgetBuyBox } from "@/components/gadget/gadget-buy-box";
import { GadgetProductCard } from "@/components/gadget/gadget-product-card";
import { ProductVideoModal } from "@/components/product/product-video-modal";
import { ReviewsSection } from "@/components/product/product-info-sections";
import { ProductViewTracker } from "@/components/product/product-view-tracker";
import { applyGadgetStudioImages, applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { products2Href } from "@/lib/gadget-preview";
import { fetchApprovedReviews, fetchAllProducts, fetchProductBySlug, fetchSiteSettings } from "@/lib/db/store";
import { isDemoSession } from "@/lib/demo";
import { normalizeSettings } from "@/lib/site-config";
import { imageUrl } from "@/lib/sanity/image";
import type { Product, ProductReview } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await fetchProductBySlug(params.slug, isDemoSession()).catch(() => null);
  if (!product) return { robots: { index: false, follow: false } };
  
  const title = `${product.name} — Buy in Pakistan | Accessories Hub`;
  const description =
    product.shortDescription ||
    `Buy ${product.name} at the best price in Pakistan with fast nationwide shipping & official warranty.`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://voltgear.pk";
  const url = `${siteUrl}/product/${product.slug}`;
  const firstImg = product.images?.[0] ? imageUrl(product.images[0], { w: 800 }) : undefined;

  return {
    title,
    description,
    keywords: [
      product.name,
      `${product.name} price in Pakistan`,
      `${product.category} in Pakistan`,
      "buy online Pakistan",
      "Accessories Hub",
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
    },
  };
}

export default async function Product2Page({ params }: { params: { slug: string } }) {
  const demo = isDemoSession();
  let product: Product | null = null;
  let related: Product[] = [];
  let settings = null;
  let approvedReviews: ProductReview[] = [];
  try {
    product = await fetchProductBySlug(params.slug, demo);
    if (product) {
      [related, settings, approvedReviews] = await Promise.all([
        fetchAllProducts(demo),
        fetchSiteSettings().catch(() => null),
        fetchApprovedReviews(product._id, demo),
      ]);
    }
  } catch {
    product = null;
  }

  if (!product) notFound();

  const mergedReviews = [...approvedReviews, ...(product.reviews ?? [])];
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
  const specs = (product.specifications ?? []).filter((s) => s?.label?.trim() && s?.value?.trim());
  const features = (product.features ?? []).filter(Boolean);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://voltgear.pk";
  const productImg = product.images?.[0] ? imageUrl(product.images[0], { w: 800 }) : undefined;

  const prodDesc = product.shortDescription || `Buy ${product.name} in Pakistan at best price.`;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: prodDesc,
    image: productImg ? [productImg] : [],
    category: product.category,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "PKR",
      availability: product.stockStatus !== "out-of-stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Accessories Hub",
      },
    },
  };

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

  return (
    <div className="gadget-scroll-pad-cta bg-[var(--g-cream)] text-[var(--g-charcoal)] lg:pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([productJsonLd, breadcrumbJsonLd]) }}
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
      />
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-10">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-[var(--g-taupe)]">
          <Link href="/" className="hover:text-[var(--g-forest)]">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href={products2Href(product.category)} className="capitalize hover:text-[var(--g-forest)]">
            {product.category.replace(/-/g, " ")}
          </Link>
          <span aria-hidden>/</span>
          <span className="line-clamp-1 text-[var(--g-charcoal)]">{product.name}</span>
        </nav>

        <ProductVideoModal 
          productName={product.name} 
          videoUrl={product.productVideo?.url}
          tiktokUrl={product.tiktokUrl}
          instagramUrl={product.instagramUrl}
        />
        <div className="mt-6">
          <GadgetBuyBox product={product} config={config} />
        </div>

        {features.length ? (
          <section className="mt-12 rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-6 sm:p-8">
            <h2 className="gadget-display text-2xl font-semibold tracking-[-0.02em]">Why you’ll like it</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 rounded-xl bg-[var(--g-cream)] px-4 py-3 text-sm text-[var(--g-charcoal)]"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--g-forest)]" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {specs.length ? (
          <section className="mt-8 rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-6 sm:p-8">
            <h2 className="gadget-display text-2xl font-semibold tracking-[-0.02em]">Specifications</h2>
            <dl className="mt-5 divide-y divide-[var(--g-line)] overflow-hidden rounded-xl border border-[var(--g-line)]">
              {specs.map((s) => (
                <div key={s.label} className="grid grid-cols-2 gap-4 bg-[var(--g-cream)]/40 px-4 py-3 text-sm">
                  <dt className="font-semibold text-[var(--g-charcoal)]">{s.label}</dt>
                  <dd className="text-[var(--g-taupe)]">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {product.inTheBox?.length ? (
          <section className="mt-8 rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-6 sm:p-8">
            <h2 className="gadget-display text-2xl font-semibold tracking-[-0.02em]">In the box</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {product.inTheBox.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-[var(--g-charcoal)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--g-forest)]" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-12">
          <ReviewsSection
            product={product}
            reviews={product.reviews ?? []}
            rating={product.rating}
            includeDemo={demo}
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
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
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
