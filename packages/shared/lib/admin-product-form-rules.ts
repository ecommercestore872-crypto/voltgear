import type { AdminProduct } from "@/lib/db/admin-types";
import type { ProductDocument } from "@/lib/db/publish";

export function emptyProductDocument(): ProductDocument {
  return {
    name: "",
    slug: "",
    category: "",
    price: 0,
    stockStatus: "in-stock",
    quantity: null,
    images: [],
    features: [],
    specifications: [],
    compatibility: [],
    inTheBox: [],
    productFaq: [],
    variants: [],
    colorEnabled: false,
    sizeEnabled: false,
    colorOptions: [],
    reviews: [],
    addons: [],
    freeShipping: false,
    collectionIntent: { mode: "preserve" },
  };
}

export function productDocumentFromAdmin(
  product?: AdminProduct | null,
  knownSlugs: readonly string[] = [],
): ProductDocument {
  if (!product) return emptyProductDocument();
  const document = product.draft ?? {
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    sku: product.sku,
    badge: product.badge,
    instagramUrl: product.instagramUrl,
    tiktokUrl: product.tiktokUrl,
    category: product.category,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    images: product.images ?? [],
    cloudinaryImages: product.cloudinaryImages,
    shortDescription: product.shortDescription,
    description: product.description,
    features: product.features,
    specifications: product.specifications,
    compatibility: product.compatibility,
    inTheBox: product.inTheBox,
    productVideo: product.productVideo,
    variants: product.variants,
    colorEnabled: product.colorEnabled,
    sizeEnabled: product.sizeEnabled,
    colorOptions: product.colorOptions,
    sizeOptions: product.sizeOptions,
    productFaq: product.productFaq,
    stockStatus: product.stockStatus,
    quantity: product.quantity ?? null,
    rating: product.rating,
    reviewCount: product.reviewCount,
    reviews: product.reviews,
    featured: product.featured,
    isDemo: product.isDemo,
    costPrice: product.costPrice,
    addons: product.addons ?? [],
    freeShipping: product.freeShipping ?? false,
  };
  const merged = {
    ...emptyProductDocument(),
    ...document,
    isDemo: Boolean(document.isDemo ?? product.isDemo),
    costPrice: document.costPrice === undefined ? product.costPrice : document.costPrice,
    inventoryIntent: document.inventoryIntent ?? { mode: "preserve" as const },
    // A legacy saved selection has no trustworthy CAS baseline. Keep it visible,
    // but require explicit review rather than attaching today's revision to it.
    collectionIntent: document.collectionIntent ?? (Array.isArray(document._collectionIds) ? undefined : { mode: "preserve" as const }),
  };
  // Legacy drafts contain inventory snapshots, not an instruction to overwrite stock.
  if (merged.inventoryIntent.mode === "preserve") {
    merged.quantity = product.quantity ?? null;
    merged.stockStatus = product.stockStatus;
  } else {
    merged.quantity = merged.inventoryIntent.quantity;
    merged.stockStatus = merged.inventoryIntent.stockStatus;
  }
  if (merged.category && !knownSlugs.includes(merged.category)) {
    merged.category = "";
  }
  return merged;
}
