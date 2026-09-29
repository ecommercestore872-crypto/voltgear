import { categoryIsAssignable } from "@/lib/db/category-rules";
import {
  generateSellableVariants,
  parseVariantOptions,
  validateVariantAxes,
  type VariantOption,
} from "@/lib/variant-options-rules";

export type PublishStatus = "draft" | "published" | "unpublished";

export interface ProductDocument {
  name: string;
  slug: string;
  brand?: string;
  sku?: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  cloudinaryImages?: string[];
  shortDescription?: string;
  description?: unknown;
  features?: string[];
  specifications?: { label: string; value: string }[];
  compatibility?: string[];
  inTheBox?: string[];
  productVideo?: { url?: string; cloudinaryPublicId?: string; poster?: string };
  variants?: Array<{
    _key?: string;
    name: string;
    sku?: string;
    price?: number;
    compareAtPrice?: number;
    stockStatus: string;
    image?: string;
    isDefault?: boolean;
  }>;
  colorEnabled?: boolean;
  sizeEnabled?: boolean;
  colorOptions?: VariantOption[];
  sizeOptions?: VariantOption[];
  productFaq?: { question: string; answer: string }[];
  stockStatus: string;
  quantity?: number | null;
  rating?: number;
  reviewCount?: number;
  reviews?: Array<{
    name?: string;
    rating?: number;
    date?: string;
    comment?: string;
    reply?: string;
    verified?: boolean;
    image?: string;
    isDemo?: boolean;
  }>;
  featured?: boolean;
  badge?: string;
  isDemo?: boolean;
  costPrice?: number;
  tiktokUrl?: string;
  instagramUrl?: string;
  addons?: Array<{
    _key?: string;
    name: string;
    price: number;
    image?: string;
    badge?: string;
    description?: string;
  }>;
  freeShipping?: boolean;
}

export function shopVisible(status: unknown): boolean {
  return status === "published";
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Short mobile/quick saves omit description and brand; empty detail arrays mean "unchanged". */
function isShortProductFormPatch(form: ProductDocument): boolean {
  return form.description === undefined && form.brand === undefined;
}

function mergeDetailList<T>(
  formValue: T[] | undefined,
  existingValue: T[] | undefined,
  shortPatch: boolean
): T[] | undefined {
  if (formValue === undefined) return existingValue;
  if (shortPatch && formValue.length === 0) return existingValue;
  return formValue;
}

function mergeProductVideo(
  form: ProductDocument,
  existing: ProductDocument | undefined
): ProductDocument["productVideo"] {
  if (form.productVideo === undefined) return existing?.productVideo;
  const videoUrl = form.productVideo.url?.trim() || "";
  const poster = form.productVideo.poster?.trim() || undefined;
  if (videoUrl) {
    return { url: videoUrl, poster, cloudinaryPublicId: undefined };
  }
  if (poster) {
    return {
      url: undefined,
      poster,
      cloudinaryPublicId: existing?.productVideo?.cloudinaryPublicId,
    };
  }
  return undefined;
}

/** Keep extras the short admin form does not show. Full editor fields always win. */
export function mergeProductForm(
  existing: ProductDocument | undefined,
  form: ProductDocument
): ProductDocument {
  const name = form.name?.trim() ?? "";
  const slug = form.slug?.trim() || slugify(name);
  const shortPatch = isShortProductFormPatch(form);
  const productVideo = mergeProductVideo(form, existing);

  return {
    name,
    slug,
    category: form.category?.trim() ?? "",
    price: Number.isFinite(form.price) ? form.price : 0,
    compareAtPrice: form.compareAtPrice ?? existing?.compareAtPrice,
    images: form.images ?? [],
    shortDescription: form.shortDescription ?? existing?.shortDescription,
    description: form.description ?? existing?.description,
    stockStatus:
      form.quantity === 0 ? "out-of-stock" : form.stockStatus || "in-stock",
    quantity:
      form.quantity != null && Number.isInteger(form.quantity) && form.quantity >= 0
        ? form.quantity
        : null,
    featured: Boolean(form.featured),
    isDemo: Boolean(form.isDemo),
    costPrice:
      form.costPrice != null && Number.isFinite(form.costPrice) && form.costPrice >= 0
        ? form.costPrice
        : existing?.costPrice,
    productVideo,
    brand: form.brand ?? existing?.brand,
    sku: form.sku ?? existing?.sku,
    badge: form.badge ?? existing?.badge,
    cloudinaryImages: form.cloudinaryImages ?? existing?.cloudinaryImages,
    features: mergeDetailList(form.features, existing?.features, shortPatch),
    specifications: mergeDetailList(form.specifications, existing?.specifications, shortPatch),
    compatibility: mergeDetailList(form.compatibility, existing?.compatibility, shortPatch),
    inTheBox: mergeDetailList(form.inTheBox, existing?.inTheBox, shortPatch),
    variants: mergeDetailList(form.variants, existing?.variants, shortPatch),
    colorEnabled: form.colorEnabled ?? existing?.colorEnabled ?? false,
    sizeEnabled: form.sizeEnabled ?? existing?.sizeEnabled ?? false,
    colorOptions: form.colorOptions ?? existing?.colorOptions ?? [],
    sizeOptions: form.sizeOptions ?? existing?.sizeOptions ?? [],
    productFaq: mergeDetailList(form.productFaq, existing?.productFaq, shortPatch),
    reviews: form.reviews ?? existing?.reviews,
    rating: form.rating ?? existing?.rating,
    reviewCount: form.reviewCount ?? existing?.reviewCount,
    tiktokUrl: form.tiktokUrl ?? existing?.tiktokUrl,
    instagramUrl: form.instagramUrl ?? existing?.instagramUrl,
    addons: form.addons ?? existing?.addons ?? [],
    freeShipping: form.freeShipping ?? existing?.freeShipping ?? false,
  };
}


export function canSaveDraft(
  input: {
    name?: string;
    slug?: string;
    category?: string;
  },
  types: { slug: string }[]
): { ok: true } | { ok: false; error: string } {
  if (!input.name?.trim() || !input.slug?.trim()) {
    return { ok: false, error: "Name and slug are required to save a draft." };
  }
  const category = categoryIsAssignable(input.category, types);
  if (!category.ok) return category;
  return { ok: true };
}

export function canPublish(
  input: {
    name?: string;
    slug?: string;
    category?: string;
    price?: number;
    colorEnabled?: boolean;
    sizeEnabled?: boolean;
    colorOptions?: VariantOption[];
    sizeOptions?: VariantOption[];
  },
  types: { slug: string }[]
): { ok: true } | { ok: false; error: string } {
  if (!input.name?.trim() || !input.slug?.trim()) {
    return { ok: false, error: "Name and slug are required to publish." };
  }
  const category = categoryIsAssignable(input.category, types);
  if (!category.ok) return category;
  if (input.price == null || !Number.isFinite(input.price) || input.price < 0) {
    return { ok: false, error: "A non-negative price is required to publish." };
  }
  const axes = validateVariantAxes({
    colorEnabled: Boolean(input.colorEnabled),
    sizeEnabled: Boolean(input.sizeEnabled),
    colorOptions: parseVariantOptions(input.colorOptions),
    sizeOptions: parseVariantOptions(input.sizeOptions),
  });
  if (!axes.ok) return axes;
  return { ok: true };
}

export function withGeneratedVariants(doc: ProductDocument): ProductDocument {
  const colorEnabled = Boolean(doc.colorEnabled);
  const sizeEnabled = Boolean(doc.sizeEnabled);
  const colorOptions = parseVariantOptions(doc.colorOptions);
  const sizeOptions = parseVariantOptions(doc.sizeOptions);
  if (!colorEnabled && !sizeEnabled) {
    return {
      ...doc,
      colorEnabled: false,
      sizeEnabled: false,
      colorOptions,
      sizeOptions,
    };
  }
  return {
    ...doc,
    colorEnabled,
    sizeEnabled,
    colorOptions,
    sizeOptions,
    variants: generateSellableVariants(
      { colorEnabled, sizeEnabled, colorOptions, sizeOptions },
      doc.stockStatus || "in-stock"
    ),
  };
}

export function slugTaken(
  slug: string,
  existing: { id: string; slug: string }[],
  currentId?: string
): boolean {
  const s = slug.trim();
  return existing.some((row) => row.slug === s && row.id !== currentId);
}

export function applySaveDraft<T extends Record<string, unknown>>(
  live: T,
  draft: ProductDocument
): T & { draft: ProductDocument } {
  return { ...live, draft };
}

export function toLiveProductRow(doc: ProductDocument) {
  return {
    name: doc.name.trim(),
    slug: doc.slug.trim(),
    brand: doc.brand?.trim() || null,
    sku: doc.sku?.trim() || null,
    category: doc.category,
    price: doc.price,
    compare_at_price: doc.compareAtPrice ?? null,
    short_description: doc.shortDescription ?? null,
    description: doc.description ?? null,
    features: doc.features ?? [],
    specifications: doc.specifications ?? [],
    compatibility: doc.compatibility ?? [],
    in_the_box: doc.inTheBox ?? [],
    product_video: { ...(doc.productVideo ?? {}), tiktokUrl: doc.tiktokUrl ?? null, instagramUrl: doc.instagramUrl ?? null },
    product_faq: doc.productFaq ?? [],
    stock_status: doc.stockStatus || "in-stock",
    quantity:
      doc.quantity != null && Number.isInteger(doc.quantity) && doc.quantity >= 0
        ? doc.quantity
        : null,
    rating: doc.rating ?? null,
    review_count: doc.reviewCount ?? doc.reviews?.length ?? 0,
    featured: Boolean(doc.featured),
    badge: doc.badge?.trim() || null,
    cloudinary_images: doc.cloudinaryImages ?? [],
    cost_price:
      doc.costPrice != null && Number.isFinite(doc.costPrice) && doc.costPrice >= 0
        ? doc.costPrice
        : null,
    is_demo: Boolean(doc.isDemo),
    color_enabled: Boolean(doc.colorEnabled),
    size_enabled: Boolean(doc.sizeEnabled),
    color_options: parseVariantOptions(doc.colorOptions),
    size_options: parseVariantOptions(doc.sizeOptions),
    addons: doc.addons ?? [],
    free_shipping: Boolean(doc.freeShipping),
    status: "published" as const,
    draft: null,
  };
}

export function toImageRows(productId: string, images: string[]) {
  return images
    .filter(Boolean)
    .map((url, sort_order) => ({
      product_id: productId,
      url,
      sort_order,
      source: url.includes("supabase.co") ? "supabase" : "cloudinary",
    }));
}

export function toVariantRows(
  productId: string,
  variants: ProductDocument["variants"] = []
) {
  return variants.map((v, i) => ({
    product_id: productId,
    key: v._key || `v${i}`,
    name: v.name,
    sku: v.sku ?? null,
    price: v.price ?? null,
    compare_at_price: v.compareAtPrice ?? null,
    stock_status: v.stockStatus || "in-stock",
    image_url: v.image ?? null,
    is_default: Boolean(v.isDefault),
  }));
}

export function toReviewRows(
  productId: string,
  reviews: ProductDocument["reviews"] = []
) {
  return reviews.map((r) => ({
    product_id: productId,
    name: r.name ?? null,
    rating: r.rating ?? null,
    review_date: r.date ?? null,
    comment: r.comment ?? null,
    reply: r.reply ?? null,
    verified: Boolean(r.verified),
    image: r.image ?? null,
    is_demo: Boolean(r.isDemo),
  }));
}

export function mergeApprovedReview(
  draft: ProductDocument | null,
  liveReviews: NonNullable<ProductDocument["reviews"]>,
  approved: NonNullable<ProductDocument["reviews"]>[number]
): {
  draft: ProductDocument | null;
  liveReviews: NonNullable<ProductDocument["reviews"]>;
} {
  const nextLive = [...liveReviews, approved];
  if (!draft) return { draft: null, liveReviews: nextLive };
  const reviews = [...(draft.reviews ?? []), approved];
  return {
    draft: { ...draft, reviews, reviewCount: reviews.length },
    liveReviews: nextLive,
  };
}

export {
  portableTextToPlain,
  textToPortableText,
} from "@/lib/product-detail-copy";

export { ADMIN_COOKIE } from "@/lib/admin-cookie";
