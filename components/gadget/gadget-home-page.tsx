import { GadgetBlogSection } from "@/components/gadget/gadget-blog-section";
import { GadgetFeaturedProduct } from "@/components/gadget/gadget-featured-product";
import { GadgetHeroSlider } from "@/components/gadget/gadget-hero-slider";
import { GadgetLifestyleShop } from "@/components/gadget/gadget-lifestyle-shop";
import { GadgetNewArrivals } from "@/components/gadget/gadget-new-arrivals";
import { GadgetReveal } from "@/components/gadget/gadget-reveal";
import { GadgetReviewsSlider } from "@/components/gadget/gadget-reviews-slider";
import { GadgetShopCategories } from "@/components/gadget/gadget-shop-categories";
import { GadgetTrustStrip } from "@/components/gadget/gadget-trust-strip";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import {
  fetchBlogPosts,
  fetchHeroSlides,
  fetchHomeBestsellers,
  fetchAllProducts,
  fetchShopTypes,
  fetchSiteSettings,
  fetchTestimonials,
} from "@/lib/db/store";
import { isDemoSession } from "@/lib/demo";
import {
  gadgetDemoHeroBanners,
  gadgetLifestyleFeatureImage,
} from "@/lib/gadget-creatives";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { gadgetShopTypeLinks, product2Href, products2Href } from "@/lib/gadget-preview";
import { fetchProductsForHomeSlot } from "@/lib/db/collection-store";
import {
  enabledHomeSectionIds,
  normalizeHomeSections,
} from "@/lib/db/home-section-rules";
import { normalizeSettings } from "@/lib/site-config";
import { getStockState } from "@/lib/stock";
import type { Page, Product, Testimonial } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

function hasUsableImage(product: Product) {
  return Boolean(product.images?.[0] || product.cloudinaryImages?.[0]);
}

/** Shared Biometic homepage used by live `/` (and formerly `/home2`). */
export async function GadgetHomePage() {
  const demo = isDemoSession();
  let products: Product[] = [];
  let testimonials: Testimonial[] = [];
  let slides: Awaited<ReturnType<typeof fetchHeroSlides>> = [];
  let bestsellers: Product[] = [];
  let blogPosts: Page[] = [];
  let settings = null;
  let shopTypes = gadgetShopTypeLinks(FALLBACK_SHOP_TYPES);
  let slotBestsellers: Product[] | null = null;
  let slotFeatured: Product[] | null = null;
  let slotOffers: Product[] | null = null;
  try {
    const [s, p, t, set, types, best, blogs, colBest, colFeat, colOffers] =
      await Promise.all([
        fetchHeroSlides(demo),
        fetchAllProducts(demo),
        fetchTestimonials(demo),
        fetchSiteSettings(),
        fetchShopTypes(),
        fetchHomeBestsellers(demo),
        fetchBlogPosts(demo),
        fetchProductsForHomeSlot("bestsellers", demo).catch(() => null),
        fetchProductsForHomeSlot("featured", demo).catch(() => null),
        fetchProductsForHomeSlot("offers", demo).catch(() => null),
      ]);
    slides = s;
    products = applyGadgetStudioImagesList(p);
    testimonials = t;
    settings = set;
    shopTypes = gadgetShopTypeLinks(types);
    bestsellers = applyGadgetStudioImagesList(best);
    blogPosts = blogs;
    slotBestsellers = colBest
      ? applyGadgetStudioImagesList(colBest)
      : null;
    slotFeatured = colFeat ? applyGadgetStudioImagesList(colFeat) : null;
    slotOffers = colOffers ? applyGadgetStudioImagesList(colOffers) : null;
  } catch {
    products = [];
  }

  const config = normalizeSettings(settings);
  const threshold = Number(config.freeShippingThreshold ?? 0);

  const categoryCards = shopTypes
    .map((cat) => {
      const slug = cat.href.split("/").pop() as string;
      const candidates = products.filter((p) => p.category === slug);
      const rep =
        candidates.find((p) => !getStockState(p.stockStatus).soldOut && hasUsableImage(p)) ??
        null;
      return rep ? { ...cat, product: rep } : null;
    })
    .filter((c): c is { label: string; href: string; product: Product } => Boolean(c));

  const trust = [
    {
      key: "shipping",
      title: threshold > 0 ? "Free Shipping" : "Fast Shipping",
      detail: threshold > 0 ? `Over ${formatPrice(threshold)}` : "Nationwide",
      icon: "shipping" as const,
      show: true,
    },
    {
      key: "cod",
      title: "Cash on Delivery",
      detail: "Pay on arrival",
      icon: "cod" as const,
      show: Boolean(config.codEnabled),
    },
    {
      key: "returns",
      title: "Easy Returns",
      detail: config.returnWindowDays ? `${config.returnWindowDays}-day policy` : "Hassle-free",
      icon: "returns" as const,
      show: true,
    },
    {
      key: "curated",
      title: "Quality Covered",
      detail: config.warrantyMonths ? `${config.warrantyMonths}-month warranty` : "Certified picks",
      icon: "curated" as const,
      show: true,
    },
  ].filter((t) => t.show);

  const newArrivals = products
    .filter((p) => !getStockState(p.stockStatus).soldOut && hasUsableImage(p))
    .slice(0, 8);

  const railProducts = (
    slotBestsellers?.length
      ? slotBestsellers
      : bestsellers.length
        ? bestsellers
        : newArrivals
  ).slice(0, 8);

  const featuredProduct =
    slotFeatured?.find(
      (p) => !getStockState(p.stockStatus).soldOut && hasUsableImage(p)
    ) ??
    products.find(
      (p) => p.featured && !getStockState(p.stockStatus).soldOut && hasUsableImage(p)
    ) ??
    railProducts.find((p) => hasUsableImage(p)) ??
    null;

  const featuredId = featuredProduct?._id;
  const offerProducts = (
    slotOffers?.length
      ? slotOffers
      : products.filter(
          (p) =>
            p._id !== featuredId &&
            !getStockState(p.stockStatus).soldOut &&
            hasUsableImage(p) &&
            typeof p.compareAtPrice === "number" &&
            p.compareAtPrice > p.price
        )
  )
    .filter(
      (p) =>
        p._id !== featuredId &&
        !getStockState(p.stockStatus).soldOut &&
        hasUsableImage(p)
    )
    .slice(0, 8);

  const bestOffers =
    offerProducts.length >= 1
      ? offerProducts
      : products
          .filter(
            (p) =>
              p._id !== featuredId &&
              !getStockState(p.stockStatus).soldOut &&
              hasUsableImage(p)
          )
          .sort((a, b) => Number(b.featured) - Number(a.featured) || a.price - b.price)
          .slice(0, 8);

  const demoBanners = gadgetDemoHeroBanners(products2Href);
  const lifestyleImage = gadgetLifestyleFeatureImage(slides[0]?.imageUrl);
  const layout = enabledHomeSectionIds(
    normalizeHomeSections(settings?.homeSections ?? null)
  );
  const trustItems = trust.map(({ key, title, detail, icon }) => ({
    key,
    title,
    detail,
    icon,
  }));

  return (
    <div className="text-[var(--g-charcoal)]">
      <GadgetHeroSlider slides={slides} fallbackBanners={demoBanners} />

      {layout.map((id, i) => {
        const delayMs = 40 + i * 20;
        switch (id) {
          case "trust":
            return trustItems.length ? (
              <GadgetReveal key={id} delayMs={delayMs}>
                <GadgetTrustStrip items={trustItems} />
              </GadgetReveal>
            ) : null;
          case "bestsellers":
            return (
              <GadgetReveal key={id} delayMs={delayMs}>
                <GadgetNewArrivals
                  products={railProducts}
                  title="Best Sellers"
                  headingId="best-sellers-heading"
                  tone="leaf"
                />
              </GadgetReveal>
            );
          case "featured":
            return featuredProduct ? (
              <GadgetReveal key={id} delayMs={delayMs}>
                <GadgetFeaturedProduct product={featuredProduct} />
              </GadgetReveal>
            ) : null;
          case "offers":
            return (
              <GadgetReveal key={id} delayMs={delayMs}>
                <GadgetNewArrivals
                  products={bestOffers}
                  title="Best Offers"
                  viewAllHref={`${products2Href()}?sort=price-asc`}
                  headingId="best-offers-heading"
                  tone="clay"
                />
              </GadgetReveal>
            );
          case "lifestyle":
            return (
              <GadgetReveal key={id} delayMs={delayMs}>
                <GadgetLifestyleShop
                  tiles={categoryCards.slice(0, 4)}
                  feature={{
                    imageUrl: lifestyleImage,
                    eyebrow: slides[0]?.subtitle || "Curated for you",
                    title: slides[0]?.title || "Rethinking everyday tech",
                    href: slides[0]
                      ? product2Href(slides[0].product.slug)
                      : products2Href(),
                    cta: "Shop now",
                  }}
                />
              </GadgetReveal>
            );
          case "categories":
            return (
              <GadgetReveal key={id} delayMs={delayMs}>
                <GadgetShopCategories tiles={categoryCards} />
              </GadgetReveal>
            );
          case "reviews":
            return (
              <GadgetReveal key={id} delayMs={delayMs}>
                <GadgetReviewsSlider reviews={testimonials} />
              </GadgetReveal>
            );
          case "blog":
            return (
              <GadgetReveal key={id} delayMs={delayMs}>
                <GadgetBlogSection posts={blogPosts} />
              </GadgetReveal>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
