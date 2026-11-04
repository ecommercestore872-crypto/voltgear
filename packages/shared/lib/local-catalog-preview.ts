import { readFileSync } from "node:fs";
import path from "node:path";

import type { Product } from "@/lib/types";

const SNAPSHOT_FILE = "public-catalog-snapshot-20261104.json";

type Snapshot = {
  products: Product[];
  details: Record<string, Product>;
};

let cached: Snapshot | null = null;

/** Explicit development-only visual mode; never use snapshot prices for an order. */
export function localCatalogPreviewEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.BNT_LOCAL_CATALOG_PREVIEW === "1"
  );
}

function cleanProduct(raw: unknown): Product | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Product;
  if (
    typeof value._id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.slug !== "string" ||
    typeof value.category !== "string" ||
    typeof value.price !== "number" ||
    !Number.isFinite(value.price) ||
    !Array.isArray(value.images) ||
    !["in-stock", "low-stock", "out-of-stock"].includes(value.stockStatus)
  ) return null;

  // Public preview data is not proof that a review came from a real order.
  return { ...value, images: value.images.filter((url) => typeof url === "string"), reviews: [], reviewCount: 0, rating: undefined };
}

function snapshot(): Snapshot | null {
  if (!localCatalogPreviewEnabled()) return null;
  if (cached) return cached;
  try {
    const file = path.resolve(process.cwd(), "../../scripts/fixtures", SNAPSHOT_FILE);
    const raw = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, "")) as {
      products?: unknown[];
      details?: Record<string, unknown>;
    };
    const products = (raw.products ?? []).map(cleanProduct).filter((p): p is Product => p !== null);
    const details: Record<string, Product> = {};
    for (const [slug, value] of Object.entries(raw.details ?? {})) {
      const product = cleanProduct(value);
      if (product && product.slug === slug) details[slug] = product;
    }
    cached = { products, details };
    return cached;
  } catch {
    return null;
  }
}

export function localPreviewProducts(): Product[] | null {
  return snapshot()?.products ?? null;
}

export function localPreviewProductBySlug(slug: string): Product | null {
  const data = snapshot();
  return data?.details[slug] ?? data?.products.find((product) => product.slug === slug) ?? null;
}
