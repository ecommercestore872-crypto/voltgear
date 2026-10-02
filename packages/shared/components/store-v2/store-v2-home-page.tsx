import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import {
  fetchHeroSlides,
  fetchHomepageProducts,
  fetchShopTypes,
  fetchSiteSettings,
  fetchTestimonials,
} from "@/lib/db/store";
import { fetchProductsForHomeSlots } from "@/lib/db/collection-store";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import {
  collectionHref,
  gadgetShopTypeLinks,
} from "@/lib/gadget-preview";
import {
  filterProductsToActiveCategories,
  slugSetFromShopTypeLinks,
} from "@/lib/home-active-categories";
import { normalizeSettings } from "@/lib/site-config";
import { getStockState } from "@/lib/stock";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { STORE_V2_HERO_FALLBACK } from "./store-v2.constants";
import { StoreV2Hero } from "./store-v2-hero";
import { StoreV2NewsletterBand } from "./store-v2-newsletter";
import {
  StoreV2Categories,
  StoreV2Collections,
  StoreV2Featured,
  StoreV2ProductRow,
  StoreV2Reviews,
  StoreV2TrustStrip,
} from "./store-v2-sections";
import { mapHeroSlidesToV2 } from "./store-v2-utils";
import "./store-v2.css";

function hasUsableImage(product: Product) {
  return Boolean(product.images?.[0] || product.cloudinaryImages?.[0]);
}

type TrustIcon = "cod" | "track" | "returns" | "warranty";

/** Store V2 homepage — beta `/beta` only; ISR + same data sources as legacy beta home. */
export async function StoreV2HomePage() {
  const demo = false;
  let products: Product[] = [];
  let testimonials: Awaited<ReturnType<typeof fetchTestimonials>> = [];
  let slides: Awaited<ReturnType<typeof fetchHeroSlides>> = [];
  let settings = null;
  let shopTypes = gadgetShopTypeLinks(FALLBACK_SHOP_TYPES);
  let slotBestsellers: Product[] | null = null;
  let slotFeatured: Product[] | null = null;
  let slotOffers: Product[] | null = null;

  try {
    const [s, p, t, set, types, homeSlots] = await Promise.all([
      fetchHeroSlides(demo),
      fetchHomepageProducts(demo),
      fetchTestimonials(demo),
      fetchSiteSettings(),
      fetchShopTypes(),
      fetchProductsForHomeSlots(demo).catch(() => null),
    ]);
    slides = s;
    products = applyGadgetStudioImagesList(p);
    testimonials = t;
    settings = set;
    shopTypes = gadgetShopTypeLinks(types);
    slotBestsellers = homeSlots?.bestsellers
      ? applyGadgetStudioImagesList(homeSlots.bestsellers)
      : null;
    slotFeatured = homeSlots?.featured
      ? applyGadgetStudioImagesList(homeSlots.featured)
      : null;
    slotOffers = homeSlots?.offers ? applyGadgetStudioImagesList(homeSlots.offers) : null;
  } catch {
    products = [];
  }

  const activeCategorySlugs = slugSetFromShopTypeLinks(shopTypes);
  const keepActive = (list: Product[]) =>
    filterProductsToActiveCategories(list, activeCategorySlugs);
  products = keepActive(products);
  if (slotBestsellers) slotBestsellers = keepActive(slotBestsellers);
  if (slotFeatured) slotFeatured = keepActive(slotFeatured);
  if (slotOffers) slotOffers = keepActive(slotOffers);

  const config = normalizeSettings(settings);
  const threshold = Number(config.freeShippingThreshold ?? 0);

  const trustItems: { title: string; detail: string; icon: TrustIcon }[] = [
    {
      title: "Cash on Delivery",
      detail: "Pay on arrival",
      icon: "cod",
    },
    {
      title: threshold > 0 ? "Free shipping" : "Fast shipping",
      detail: threshold > 0 ? `Over ${formatPrice(threshold)}` : "Nationwide PostEx",
      icon: "track",
    },
    {
      title: "Easy returns",
      detail: config.returnWindowDays
        ? `${config.returnWindowDays}-day policy`
        : "Hassle-free",
      icon: "returns",
    },
    {
      title: "Quality covered",
      detail: config.warrantyMonths
        ? `${config.warrantyMonths}-month warranty`
        : "Certified picks",
      icon: "warranty",
    },
  ];
  if (config.codEnabled === false) {
    trustItems.shift();
  }

  const categoryTiles = shopTypes.slice(0, 6).map((cat) => {
    const slug = cat.slug ?? (cat.href.split("/").pop() as string);
    return { label: cat.label, href: cat.href, slug };
  });

  const newArrivals = products
    .filter((p) => !getStockState(p.stockStatus).soldOut && hasUsableImage(p))
    .slice(0, 8);

  const bestSellers = (
    slotBestsellers?.length ? slotBestsellers : newArrivals
  ).slice(0, 4);

  const featuredProduct =
    slotFeatured?.find(
      (p) => !getStockState(p.stockStatus).soldOut && hasUsableImage(p),
    ) ??
    products.find(
      (p) =>
        p.featured &&
        !getStockState(p.stockStatus).soldOut &&
        hasUsableImage(p),
    ) ??
    bestSellers[0] ??
    null;

  const featuredId = featuredProduct?._id;
  const sidePool = (
    slotOffers?.length
      ? slotOffers
      : products.filter(
          (p) =>
            p._id !== featuredId &&
            !getStockState(p.stockStatus).soldOut &&
            hasUsableImage(p),
        )
  )
    .filter((p) => p._id !== featuredId && hasUsableImage(p))
    .slice(0, 2);

  const heroFallback = STORE_V2_HERO_FALLBACK.map((s) => ({
    ...s,
    alt: s.title,
  }));
  const heroSlides = mapHeroSlidesToV2(slides, heroFallback);

  return (
    <div className="store-v2">
      <StoreV2Hero slides={heroSlides} />
      <StoreV2TrustStrip items={trustItems} />
      <StoreV2Categories tiles={categoryTiles} />
      {featuredProduct ? (
        <StoreV2Featured main={featuredProduct} side={sidePool} />
      ) : null}
      <StoreV2Collections />
      <StoreV2ProductRow
        id="sv2-bestsellers-heading"
        title={config.homeBestsellersTitle || "Best sellers"}
        products={bestSellers}
        viewAllHref={collectionHref("best-sellers")}
      />
      <StoreV2ProductRow
        id="sv2-new-arrivals-heading"
        title="New arrivals"
        products={newArrivals.slice(0, 4)}
        viewAllHref={collectionHref("new-arrivals")}
        tone="soft"
      />
      <StoreV2Reviews reviews={testimonials} />
      <StoreV2NewsletterBand />
    </div>
  );
}
