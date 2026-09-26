import { Fragment, type ReactNode } from "react";
import { GadgetBlogSection } from "@/components/gadget/gadget-blog-section";
import { GadgetFeaturedProduct } from "@/components/gadget/gadget-featured-product";
import { GadgetLifestyleShop } from "@/components/gadget/gadget-lifestyle-shop";
import { GadgetNewArrivals } from "@/components/gadget/gadget-new-arrivals";
import { GadgetReviewsSlider } from "@/components/gadget/gadget-reviews-slider";
import { GadgetShopCategories } from "@/components/gadget/gadget-shop-categories";
import { GadgetTrustStrip } from "@/components/gadget/gadget-trust-strip";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import {
  fetchBlogPosts,
  fetchHomepageProducts,
  fetchProductBySlug,
  fetchTestimonials,
} from "@/lib/db/store";
import {
  loadStorefrontSettings,
  loadStorefrontShopTypes,
} from "@/lib/db/storefront-shell";
import {
  homeLayoutIdsForLifestyle,
  lifestyleShopHasContent,
  normalizeLifestyleShop,
} from "@/lib/db/lifestyle-shop-rules";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { collectionHref, gadgetShopTypeLinks } from "@/lib/gadget-preview";
import {
  fetchExtraCollectionRails,
  fetchProductsForHomeSlots,
} from "@/lib/db/collection-store";
import {
  normalizeHomeSections,
  type HomeSectionId,
} from "@/lib/db/home-section-rules";
import { normalizeSettings } from "@/lib/site-config";
import { getStockState } from "@/lib/stock";
import type { Page, Product, Testimonial } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

function hasUsableImage(product: Product) {
  return Boolean(product.images?.[0] || product.cloudinaryImages?.[0]);
}

/** Below-the-fold homepage sections (heavy catalog reads). */
export async function GadgetHomeSections() {
  const demo = false;
  let products: Product[] = [];
  let testimonials: Testimonial[] = [];
  let blogPosts: Page[] = [];
  let settings = null;
  let shopTypes = gadgetShopTypeLinks(FALLBACK_SHOP_TYPES);
  let slotBestsellers: Product[] | null = null;
  let slotFeatured: Product[] | null = null;
  let slotOffers: Product[] | null = null;
  let extraRails: Awaited<ReturnType<typeof fetchExtraCollectionRails>> = [];

  try {
    const [set, types] = await Promise.all([
      loadStorefrontSettings(),
      loadStorefrontShopTypes(),
    ]);
    settings = set;
    shopTypes = gadgetShopTypeLinks(types);

    const lifestyleShopDraft = normalizeLifestyleShop(settings?.lifestyleShop);
    const layoutIds = homeLayoutIdsForLifestyle(
      normalizeHomeSections(settings?.homeSections ?? null),
      lifestyleShopDraft,
    );
    const needsReviews = layoutIds.includes("reviews");
    const needsBlog = layoutIds.includes("blog");

    const [p, t, blogs, homeSlots, extra] = await Promise.all([
      fetchHomepageProducts(demo),
      needsReviews
        ? fetchTestimonials(demo)
        : Promise.resolve([] as Testimonial[]),
      needsBlog ? fetchBlogPosts(demo) : Promise.resolve([] as Page[]),
      fetchProductsForHomeSlots(demo).catch(() => null),
      fetchExtraCollectionRails(demo).catch(() => []),
    ]);
    const colBest = homeSlots?.bestsellers ?? null;
    const colFeat = homeSlots?.featured ?? null;
    const colOffers = homeSlots?.offers ?? null;
    products = applyGadgetStudioImagesList(p);
    testimonials = t.map((m) => ({ ...m, product: undefined }));
    blogPosts = blogs.map((b) => ({ ...b, sections: [] }));
    slotBestsellers = colBest
      ? applyGadgetStudioImagesList(colBest).map((prod) => ({
          ...prod,
          reviews: [],
          variants: [],
        }))
      : null;
    slotFeatured = colFeat
      ? applyGadgetStudioImagesList(colFeat).map((prod) => ({
          ...prod,
          reviews: [],
          variants: [],
        }))
      : null;
    slotOffers = colOffers
      ? applyGadgetStudioImagesList(colOffers).map((prod) => ({
          ...prod,
          reviews: [],
          variants: [],
        }))
      : null;
    extraRails = extra.map((rail) => ({
      ...rail,
      products: applyGadgetStudioImagesList(rail.products).map((prod) => ({
        ...prod,
        reviews: [],
        variants: [],
      })),
    }));

    if (settings?.draft?.homeFeaturedProductSlug) {
      const slug = String(settings.draft.homeFeaturedProductSlug);
      const alreadyLoaded =
        products.some((p) => p.slug === slug) ||
        slotBestsellers?.some((p) => p.slug === slug) ||
        slotFeatured?.some((p) => p.slug === slug) ||
        slotOffers?.some((p) => p.slug === slug) ||
        extraRails.some((rail) => rail.products.some((p) => p.slug === slug));
      if (!alreadyLoaded) {
        const over = await fetchProductBySlug(slug, demo).catch(() => null);
        if (over) {
          products.push(...applyGadgetStudioImagesList([over]));
        }
      }
    }

    products = products.map((prod) => ({ ...prod, reviews: [], variants: [] }));
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
        candidates.find(
          (p) => !getStockState(p.stockStatus).soldOut && hasUsableImage(p),
        ) ?? null;
      return rep ? { ...cat, product: rep } : null;
    })
    .filter((c): c is { label: string; href: string; product: Product } =>
      Boolean(c),
    );

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
      detail: config.returnWindowDays
        ? `${config.returnWindowDays}-day policy`
        : "Hassle-free",
      icon: "returns" as const,
      show: true,
    },
    {
      key: "curated",
      title: "Quality Covered",
      detail: config.warrantyMonths
        ? `${config.warrantyMonths}-month warranty`
        : "Certified picks",
      icon: "curated" as const,
      show: true,
    },
  ].filter((t) => t.show);

  const newArrivals = products
    .filter((p) => !getStockState(p.stockStatus).soldOut && hasUsableImage(p))
    .slice(0, 8);

  const railProducts = (
    slotBestsellers?.length ? slotBestsellers : newArrivals
  ).slice(0, 8);

  const overrideSlug = settings?.draft?.homeFeaturedProductSlug as
    | string
    | undefined;
  const customImage = settings?.draft?.homeFeaturedCustomImage as
    | string
    | undefined;

  const featuredProduct = overrideSlug
    ? (products.find((p) => p.slug === overrideSlug) ?? null)
    : (slotFeatured?.find(
        (p) => !getStockState(p.stockStatus).soldOut && hasUsableImage(p),
      ) ??
      products.find(
        (p) =>
          p.featured &&
          !getStockState(p.stockStatus).soldOut &&
          hasUsableImage(p),
      ) ??
      railProducts.find((p) => hasUsableImage(p)) ??
      null);

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
            p.compareAtPrice > p.price,
        )
  )
    .filter(
      (p) =>
        p._id !== featuredId &&
        !getStockState(p.stockStatus).soldOut &&
        hasUsableImage(p),
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
              hasUsableImage(p),
          )
          .sort(
            (a, b) =>
              Number(b.featured) - Number(a.featured) || a.price - b.price,
          )
          .slice(0, 8);

  const lifestyleShop = normalizeLifestyleShop(settings?.lifestyleShop);
  const layout = homeLayoutIdsForLifestyle(
    normalizeHomeSections(settings?.homeSections ?? null),
    lifestyleShop,
  );
  const trustItems = trust.map(({ key, title, detail, icon }) => ({
    key,
    title,
    detail,
    icon,
  }));
  const merchIds: HomeSectionId[] = ["bestsellers", "featured", "offers"];
  const lastMerchId = [...layout].reverse().find((id) => merchIds.includes(id));
  const extraRailTones = ["leaf", "clay", "default"] as const;

  function extraCollectionSections() {
    return extraRails.map((rail, index) => (
      <GadgetNewArrivals
        key={`collection-${rail.id}`}
        products={rail.products}
        title={rail.name}
        headingId={`collection-${rail.slug}-heading`}
        viewAllHref={collectionHref(rail.slug)}
        tone={extraRailTones[index % extraRailTones.length]}
      />
    ));
  }

  return (
    <>
      {layout.map((id) => {
        let section: ReactNode = null;
        switch (id) {
          case "trust":
            section = trustItems.length ? (
              <GadgetTrustStrip
                key={id}
                items={trustItems}
                headline={config.homeTrustHeadline ?? undefined}
                accent={config.homeTrustAccent ?? undefined}
              />
            ) : null;
            break;
          case "bestsellers":
            section = (
              <GadgetNewArrivals
                key={id}
                products={railProducts}
                title={config.homeBestsellersTitle || "Best Sellers"}
                headingId="best-sellers-heading"
                viewAllHref={collectionHref("best-sellers")}
                tone="leaf"
              />
            );
            break;
          case "featured":
            section = featuredProduct ? (
              <GadgetFeaturedProduct
                key={id}
                product={featuredProduct}
                eyebrow={config.homeFeaturedEyebrow}
                title={config.homeFeaturedTitle}
                subtitle={config.homeFeaturedSubtitle}
                productDescription={config.homeFeaturedProductDescription}
                customImage={customImage}
              />
            ) : null;
            break;
          case "offers":
            section = (
              <GadgetNewArrivals
                key={id}
                products={bestOffers}
                title={config.homeOffersTitle || "Best Offers"}
                viewAllHref={collectionHref("best-offers")}
                headingId="best-offers-heading"
                tone="clay"
              />
            );
            break;
          case "lifestyle":
            section = lifestyleShopHasContent(lifestyleShop) ? (
              <GadgetLifestyleShop key={id} shop={lifestyleShop} />
            ) : null;
            break;
          case "categories":
            section = (
              <GadgetShopCategories
                key={id}
                tiles={categoryCards}
                title={config.homeCategoriesTitle || undefined}
              />
            );
            break;
          case "reviews":
            section = <GadgetReviewsSlider key={id} reviews={testimonials} />;
            break;
          case "blog":
            section = <GadgetBlogSection key={id} posts={blogPosts} />;
            break;
          default:
            section = null;
        }
        if (id !== lastMerchId) return section;
        return (
          <Fragment key={`${id}-extras`}>
            {section}
            {extraCollectionSections()}
          </Fragment>
        );
      })}
      {!lastMerchId ? extraCollectionSections() : null}
    </>
  );
}
