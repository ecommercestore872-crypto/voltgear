import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

import { PurchaseSection } from "@/components/product/purchase-section";
import { FrequentlyBoughtTogether } from "@/components/product/frequently-bought-together";
import { RelatedProducts } from "@/components/product/related-products";
import { ProductViewTracker } from "@/components/product/product-view-tracker";
import { ProductVideoModal } from "@/components/product/product-video-modal";
import {
  CompatibilitySection,
  DescriptionSection,
  InTheBoxSection,
  KeyFeaturesSection,
  ProductFaqSection,
  ProductVideoSection,
  ReviewsSection,
  SpecificationsSection,
} from "@/components/product/product-info-sections";
import { fetchApprovedReviews, fetchAllProducts, fetchProductBySlug, fetchProductSlugs } from "@/lib/db/store";
import { isDemoSession } from "@/lib/demo";
import { publicSiteUrl } from "@/lib/deploy-rules";
import { getSettings } from "@/lib/sanity/settings";
import { cloudinaryImageUrl } from "@/lib/cloudinary";
import { imageUrl } from "@/lib/sanity/image";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { normalizeSettings } from "@/lib/site-config";
import type { Product, ProductReview } from "@/lib/types";

export const revalidate = 60;

const StickyAddToCart = dynamic(
  () =>
    import("@/components/product/sticky-add-to-cart").then(
      (m) => m.StickyAddToCart
    ),
  { ssr: false, loading: () => null }
);

export async function generateStaticParams() {
  try {
    const slugs = await fetchProductSlugs();
    return slugs.map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  let product: Product | null = null;
  try {
    product = await fetchProductBySlug(params.slug, isDemoSession());
  } catch {
    product = null;
  }
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDescription || product.name,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      type: "website",
      images: product.images?.[0]
        ? [imageUrl(product.images[0], { w: PRODUCT_IMAGE.gallery })]
        : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
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
        getSettings().catch(() => null),
        fetchApprovedReviews(product._id, demo),
      ]);
    }
  } catch {
    product = null;
  }

  if (!product) notFound();

  // Approved customer reviews (moderated submissions) surface on top of the
  // seeded reviews embedded in the product document.
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

  const config = normalizeSettings(settings);

  const relatedProducts = related
    .filter((p) => p._id !== product._id && p.category === product.category)
    .sort((a, b) => {
      const rank = (s: string) => (s === "out-of-stock" ? 1 : s === "low-stock" ? 1 : 0);
      return rank(a.stockStatus) - rank(b.stockStatus);
    })
    .slice(0, 8);

  const siteUrl = publicSiteUrl();
  const availability: Record<string, string> = {
    "in-stock": "https://schema.org/InStock",
    "low-stock": "https://schema.org/LimitedAvailability",
    "out-of-stock": "https://schema.org/OutOfStock",
  };
  const productImages = [
    ...(product.cloudinaryImages ?? []).map((id) =>
      cloudinaryImageUrl(id, { w: PRODUCT_IMAGE.gallery })
    ),
    ...(product.images ?? []).map((img) => imageUrl(img, { w: PRODUCT_IMAGE.gallery })),
  ];
  const realReviews = (productWithReviews.reviews ?? []).filter(
    (r) => !r.isDemo && r.name && typeof r.rating === "number"
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.name,
    image: productImages,
    sku: product.sku || product.slug,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.category,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/product/${product.slug}`,
      priceCurrency: "PKR",
      price: product.price,
      availability: availability[product.stockStatus] ?? availability["in-stock"],
      priceValidUntil: new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      ).toISOString().slice(0, 10),
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(typeof product.rating === "number" &&
    typeof productWithReviews.reviewCount === "number" &&
    productWithReviews.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: productWithReviews.reviewCount,
          },
        }
      : {}),
    ...(realReviews.length
      ? {
          review: realReviews.map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.name },
            datePublished: r.date,
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
            },
            reviewBody: r.comment,
          })),
        }
      : {}),
  };

  return (
    <div className="container mx-auto px-4 py-6 lg:px-8">
      <ProductViewTracker
        slug={product.slug}
        name={product.name}
        price={product.price}
        image={product.images?.[0] ? imageUrl(product.images[0], { w: 128 }) : undefined}
        category={product.category}
        productId={product._id}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="flex items-center gap-1 transition-colors hover:text-primary">
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/products/${product.category}`}
          className="transition-colors hover:text-primary"
        >
          {product.category.replace("-", " ")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span aria-current="page" className="truncate font-medium text-foreground">
          {product.name}
        </span>
      </nav>

      <div className="mt-4 flex flex-col gap-4">
        <ProductVideoModal 
          productName={product.name} 
          videoUrl={product.productVideo?.url}
          tiktokUrl={product.tiktokUrl}
          instagramUrl={product.instagramUrl}
        />
        <PurchaseSection product={productWithReviews} />
      </div>


      {/* Figma Desktop Layout wrapper for Description/Specs (Side by Side) */}
      <div className="mt-12 mb-8 bg-white border border-border/40 rounded-xl overflow-hidden shadow-sm">
         <div className="flex items-center gap-8 border-b border-border/40 px-8 h-14 bg-muted/10 overflow-x-auto text-[13px] font-bold text-muted-foreground whitespace-nowrap">
            <span className="text-primary border-b-2 border-primary h-full flex items-center">Description</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Specifications</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">What&apos;s in the Box</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Compatibility</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Shipping & Returns</span>
         </div>
         
         <div className="p-8 lg:p-12">
           <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">
             <div className="flex-1 w-full max-w-xl [&>section:first-child]:!mt-0 [&>section]:!mt-10">
               <ProductVideoSection product={productWithReviews} />
               <DescriptionSection product={productWithReviews} />
               <KeyFeaturesSection product={productWithReviews} />
             </div>
             
             <div className="flex-1 w-full max-w-xl bg-muted/5 rounded-2xl p-6 md:p-8 border border-border/30 [&>section:first-child]:!mt-0 [&>section]:!mt-8">
                <SpecificationsSection product={productWithReviews} />
                <CompatibilitySection product={productWithReviews} />
                <InTheBoxSection product={productWithReviews} />
             </div>
           </div>
         </div>
      </div>

      <ReviewsSection
        product={productWithReviews}
        reviews={productWithReviews.reviews ?? []}
        rating={product.rating}
        includeDemo={demo}
      />
      <ProductFaqSection product={productWithReviews} />

      {/* Figma Support Banner */}
      <div className="my-16 border rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 p-6 md:p-8 max-w-[1440px] mx-auto">
         <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-center md:text-left">
               <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path><path d="M14 2 12 4l-2-2"></path></svg>
               </div>
               <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">Need help choosing the right product?</h3>
                  <p className="text-sm font-medium text-muted-foreground mt-1">Our VoltGear experts are here to help you 24/7.</p>
               </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-8">
               <div className="flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  <div className="flex flex-col items-start leading-tight">
                     <span className="font-bold text-foreground">0321-VOLTGEAR</span>
                     <span className="text-xs text-muted-foreground">(86584327)</span>
                  </div>
               </div>
               <a href={`https://wa.me/${config.whatsappNumber?.replace(/\D/g, "") || "923218658432"}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-6 py-3 text-sm font-bold transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  Chat on WhatsApp
               </a>
            </div>
         </div>
      </div>

      <FrequentlyBoughtTogether current={productWithReviews} />
      <RelatedProducts products={relatedProducts} />
      <StickyAddToCart product={productWithReviews} />
    </div>
  );
}