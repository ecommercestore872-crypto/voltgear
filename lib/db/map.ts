import type {
  HeroSection,
  HeroSlide,
  Page,
  Product,
  ProductReview,
  ProductVariant,
  SiteSettings,
  StockStatus,
  Testimonial,
} from "@/lib/types";
import { normalizeHomeSections } from "@/lib/db/home-section-rules";
import { parseChromeLinks } from "@/lib/chrome-nav-rules";
import { parseVariantOptions } from "@/lib/variant-options-rules";

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function stock(v: unknown): StockStatus {
  if (v === "low-stock" || v === "out-of-stock" || v === "in-stock") return v;
  return "in-stock";
}

export function mapProduct(
  row: Record<string, unknown> | null,
  opts?: { includeDemoReviews?: boolean }
): Product | null {
  if (!row) return null;
  const images = Array.isArray(row.product_images)
    ? [...row.product_images]
        .sort(
          (a: { sort_order?: number }, b: { sort_order?: number }) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0)
        )
        .map((img: { url?: string }) => img.url)
        .filter((url): url is string => Boolean(url))
    : [];
  const cloudinaryImages = Array.isArray(row.cloudinary_images)
    ? (row.cloudinary_images as string[])
    : [];
  const variants: ProductVariant[] = Array.isArray(row.product_variants)
    ? row.product_variants.map((v: Record<string, unknown>) => ({
        _key: String(v.key ?? v.id ?? ""),
        name: String(v.name ?? "Option"),
        sku: v.sku ? String(v.sku) : undefined,
        price: v.price != null ? num(v.price) : undefined,
        compareAtPrice: v.compare_at_price != null ? num(v.compare_at_price) : undefined,
        stockStatus: stock(v.stock_status),
        image: v.image_url ? String(v.image_url) : undefined,
        isDefault: Boolean(v.is_default),
      }))
    : [];
  const reviews: ProductReview[] = Array.isArray(row.product_reviews)
    ? row.product_reviews
        .filter((r: { is_demo?: boolean }) => opts?.includeDemoReviews || !r.is_demo)
        .map((r: Record<string, unknown>) => ({
          name: r.name ? String(r.name) : undefined,
          rating: r.rating != null ? num(r.rating) : undefined,
          date: r.review_date ? String(r.review_date) : undefined,
          comment: r.comment ? String(r.comment) : undefined,
          verified: Boolean(r.verified),
          image: r.image ? String(r.image) : undefined,
          isDemo: Boolean(r.is_demo),
        }))
    : [];

  return {
    _id: String(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    category: String(row.category || ""),
    price: num(row.price),
    compareAtPrice: row.compare_at_price != null ? num(row.compare_at_price) : undefined,
    images: images.length ? images : cloudinaryImages,
    cloudinaryImages,
    shortDescription: row.short_description ? String(row.short_description) : undefined,
    description: Array.isArray(row.description) ? (row.description as Product["description"]) : undefined,
    features: Array.isArray(row.features) ? (row.features as string[]) : undefined,
    specifications: Array.isArray(row.specifications)
      ? (row.specifications as Product["specifications"])
      : undefined,
    compatibility: Array.isArray(row.compatibility) ? (row.compatibility as string[]) : undefined,
    inTheBox: Array.isArray(row.in_the_box) ? (row.in_the_box as string[]) : undefined,
    productVideo: row.product_video
      ? {
          url: (row.product_video as { url?: string }).url,
          cloudinaryPublicId: (row.product_video as { cloudinaryPublicId?: string })
            .cloudinaryPublicId,
          poster: (row.product_video as { poster?: string }).poster,
        }
      : undefined,
    instagramUrl: row.product_video
      ? (row.product_video as { instagramUrl?: string }).instagramUrl
      : undefined,
    tiktokUrl: row.product_video
      ? (row.product_video as { tiktokUrl?: string }).tiktokUrl
      : undefined,
    variants,
    colorEnabled: Boolean(row.color_enabled),
    sizeEnabled: Boolean(row.size_enabled),
    colorOptions: parseVariantOptions(row.color_options),
    sizeOptions: parseVariantOptions(row.size_options),
    productFaq: Array.isArray(row.product_faq)
      ? (row.product_faq as Product["productFaq"])
      : undefined,
    sku: row.sku ? String(row.sku) : undefined,
    brand: row.brand ? String(row.brand) : undefined,
    stockStatus: stock(row.stock_status),
    quantity: row.quantity != null && Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : null,
    rating: row.rating != null ? num(row.rating) : undefined,
    reviewCount: row.review_count != null ? num(row.review_count) : undefined,
    reviews,
    featured: Boolean(row.featured),
    badge: row.badge ? String(row.badge) : undefined,
    isDemo: Boolean(row.is_demo),
  };
}

export function mapSettings(row: Record<string, unknown> | null): SiteSettings | null {
  if (!row) return null;
  return {
    brandName: String(row.brand_name ?? "Store"),
    tagline: row.tagline ? String(row.tagline) : undefined,
    logo: row.logo_url ? String(row.logo_url) : undefined,
    primaryColor: row.primary_color ? String(row.primary_color) : undefined,
    secondaryColor: row.secondary_color ? String(row.secondary_color) : undefined,
    theme: row.theme === "light" || row.theme === "dark" ? row.theme : undefined,
    headingFont: row.heading_font as SiteSettings["headingFont"],
    bodyFont: row.body_font as SiteSettings["bodyFont"],
    currency: row.currency ? String(row.currency) : undefined,
    email: row.email ? String(row.email) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    address: row.address ? String(row.address) : undefined,
    socialLinks: Array.isArray(row.social_links)
      ? (row.social_links as SiteSettings["socialLinks"])
      : undefined,
    freeShippingThreshold:
      row.free_shipping_threshold != null ? num(row.free_shipping_threshold) : undefined,
    shippingFee: row.shipping_fee != null ? num(row.shipping_fee) : undefined,
    returnPolicy: row.return_policy ? String(row.return_policy) : undefined,
    warrantyInfo: row.warranty_info ? String(row.warranty_info) : undefined,
    codEnabled: row.cod_enabled as boolean | undefined,
    whatsappNumber: row.whatsapp_number ? String(row.whatsapp_number) : undefined,
    warrantyMonths: row.warranty_months != null ? num(row.warranty_months) : undefined,
    returnWindowDays: row.return_window_days != null ? num(row.return_window_days) : undefined,
    navLinks: parseChromeLinks(row.nav_links) ?? undefined,
    helpLinks: parseChromeLinks(row.help_links) ?? undefined,
    footerCompanyLinks: parseChromeLinks(row.footer_company_links) ?? undefined,
    footerCareLinks: parseChromeLinks(row.footer_care_links) ?? undefined,
    announcement: row.announcement as SiteSettings["announcement"],
    seo: row.seo as SiteSettings["seo"],
    homeSections: normalizeHomeSections(row.home_sections),
  };
}

export function mapHero(
  row: Record<string, unknown> | null,
  featured?: Product | null
): HeroSection | null {
  if (!row) return null;
  const backgroundImages = Array.isArray(row.background_images)
    ? (row.background_images as string[]).filter((url): url is string => Boolean(url))
    : row.background_image_url
    ? [String(row.background_image_url)]
    : [];
  const primaryBgImage = row.background_image_url
    ? String(row.background_image_url)
    : backgroundImages[0] ?? undefined;

  return {
    headline: String(row.headline ?? ""),
    subheadline: row.subheadline ? String(row.subheadline) : undefined,
    backgroundImage: primaryBgImage,
    backgroundImages: backgroundImages.length ? backgroundImages : undefined,
    backgroundVideo: row.background_video ? String(row.background_video) : undefined,
    primaryCta: row.primary_cta as HeroSection["primaryCta"],
    secondaryCta: row.secondary_cta as HeroSection["secondaryCta"],
    stats: Array.isArray(row.stats) ? (row.stats as HeroSection["stats"]) : undefined,
    featuredProduct: featured ?? undefined,
  };
}

export function mapHeroSlide(
  row: Record<string, unknown>,
  product: Product
): HeroSlide {
  const overrideTitle = row.title ? String(row.title).trim() : "";
  const overrideSubtitle = row.subtitle ? String(row.subtitle).trim() : "";
  return {
    id: String(row.id),
    title: overrideTitle || product.name,
    subtitle: overrideSubtitle || undefined,
    imageUrl: String(row.image_url ?? ""),
    product,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export function mapPage(row: Record<string, unknown> | null): Page | null {
  if (!row) return null;
  return {
    title: String(row.title ?? ""),
    slug: String(row.slug ?? ""),
    pageType: row.page_type === "blog" ? "blog" : "static",
    excerpt: row.excerpt ? String(row.excerpt) : undefined,
    coverImage: row.cover_image_url ? String(row.cover_image_url) : undefined,
    publishedAt: row.published_at ? String(row.published_at) : undefined,
    author: row.author ? String(row.author) : undefined,
    sections: Array.isArray(row.sections) ? (row.sections as Page["sections"]) : undefined,
    keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : undefined,
    seo: row.seo as Page["seo"],
    isDemo: Boolean(row.is_demo),
  };
}

export function mapTestimonial(row: Record<string, unknown>): Testimonial {
  return {
    customerName: String(row.customer_name ?? ""),
    reviewText: String(row.review_text ?? ""),
    rating: num(row.rating, 5),
    product: row.product ? String(row.product) : undefined,
    verified: Boolean(row.verified),
    isDemo: Boolean(row.is_demo),
  };
}
