import { unstable_cache } from "next/cache";

import { fetchApprovedReviewStats } from "@/lib/db/review-stats-store";
import {
  EMPTY_APPROVED_REVIEW_STATS,
  type ApprovedReviewStats,
} from "@/lib/product-review-stats";
import {
  STOREFRONT_CATALOG_GRID_CACHE_TAG,
  STOREFRONT_CATALOG_REVALIDATE,
} from "@/lib/storefront-cache";
import { getServiceClient } from "@/lib/supabase/server";
import type { Product, ProductReview } from "@/lib/types";

export type StorefrontReviewInput = {
  slug: string;
  rating: number;
  name: string;
  email: string;
  comment: string;
  image?: string;
  category?: string;
  productName?: string;
  verified: boolean;
  isDemo?: boolean;
};

export type StorefrontReviewResult =
  | { ok: true; duplicate?: boolean; verified?: boolean }
  | { ok: false; error: string; status: number };

type ReviewProduct = {
  _id: string;
  slug: string;
  name: string;
  category: string;
  image?: string | null;
};

let demoColumnMissing = false;

function db() {
  return getServiceClient();
}

function isMissingIsDemoColumn(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  return Boolean(
    error && error.code === "42703" && (error.message ?? "").includes("is_demo")
  );
}

function demoFilter<T extends { or: (filters: string) => T }>(
  query: T,
  includeDemo?: boolean
): T {
  if (demoColumnMissing || includeDemo) return query;
  return query.or("is_demo.eq.false,is_demo.is.null");
}

async function execDemoQuery<
  T extends { error: { code?: string; message?: string } | null },
>(run: () => PromiseLike<T>): Promise<T> {
  const first = await run();
  if (!isMissingIsDemoColumn(first.error)) return first;
  demoColumnMissing = true;
  return run();
}

export function projectReviewProducts(products: Product[]): ReviewProduct[] {
  return products
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((product) => ({
      _id: product._id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      image: typeof product.images?.[0] === "string" ? product.images[0] : null,
    }));
}

export { fetchApprovedReviewStats };

export async function fetchCachedApprovedReviewStats(
  productId: string
): Promise<ApprovedReviewStats> {
  const id = productId.trim();
  if (!id) return EMPTY_APPROVED_REVIEW_STATS;
  return unstable_cache(
    async () => fetchApprovedReviewStats(id),
    ["approved-review-stats-v1", id],
    {
      revalidate: STOREFRONT_CATALOG_REVALIDATE,
      tags: [STOREFRONT_CATALOG_GRID_CACHE_TAG, `product-reviews-${id}`],
    }
  )();
}

export async function fetchCachedApprovedReviews(
  productId: string
): Promise<ProductReview[]> {
  const id = productId.trim();
  if (!id) return [];
  return unstable_cache(
    async () => fetchApprovedReviews(id, false),
    ["approved-reviews-v1", id],
    {
      revalidate: STOREFRONT_CATALOG_REVALIDATE,
      tags: [STOREFRONT_CATALOG_GRID_CACHE_TAG, `product-reviews-${id}`],
    }
  )();
}

export async function fetchApprovedReviews(
  productId: string,
  includeDemo = false
): Promise<ProductReview[]> {
  const { data, error } = await execDemoQuery(() =>
    demoFilter(
      db()
        .from("review_submissions")
        .select(
          "name, rating, created_at, comment, reply, verified, image, is_demo"
        )
        .eq("product_id", productId)
        .eq("status", "approved"),
      includeDemo
    ).order("created_at", { ascending: false })
  );
  if (error) throw error;
  return (data ?? []).map((review) => ({
    name: review.name ? String(review.name) : undefined,
    rating: review.rating != null ? Number(review.rating) : undefined,
    date: review.created_at ? String(review.created_at) : undefined,
    comment: review.comment ? String(review.comment) : undefined,
    reply: review.reply ? String(review.reply) : undefined,
    verified: Boolean(review.verified),
    image: review.image ? String(review.image) : undefined,
    isDemo: Boolean(review.is_demo),
  }));
}

export async function submitReviewForProduct(
  input: StorefrontReviewInput,
  productId: string
): Promise<StorefrontReviewResult> {
  let duplicateQuery = db()
    .from("review_submissions")
    .select("id")
    .eq("email", input.email)
    .eq("product_id", productId)
    .eq("status", "pending");
  if (!demoColumnMissing) {
    duplicateQuery = duplicateQuery.eq("is_demo", Boolean(input.isDemo));
  }
  const duplicateResult = await duplicateQuery.limit(1);
  let existing = duplicateResult.data;
  if (isMissingIsDemoColumn(duplicateResult.error)) {
    demoColumnMissing = true;
    ({ data: existing } = await db()
      .from("review_submissions")
      .select("id")
      .eq("email", input.email)
      .eq("product_id", productId)
      .eq("status", "pending")
      .limit(1));
  } else if (duplicateResult.error) {
    console.error("[reviews] duplicate check failed", duplicateResult.error.message);
    return {
      ok: false,
      error: "Something went wrong submitting your review.",
      status: 503,
    };
  }
  if (existing?.length) return { ok: true, duplicate: true };

  const row: Record<string, unknown> = {
    product_id: productId,
    name: input.name,
    email: input.email,
    rating: input.rating,
    comment: input.comment,
    image: input.image || null,
    category: input.category || null,
    product_name: input.productName || null,
    verified: input.verified,
    status: "pending",
    is_demo: Boolean(input.isDemo),
  };
  let { error } = await db().from("review_submissions").insert(row);
  if (isMissingIsDemoColumn(error)) {
    demoColumnMissing = true;
    const fallbackRow = { ...row };
    delete (fallbackRow as { is_demo?: boolean }).is_demo;
    ({ error } = await db().from("review_submissions").insert(fallbackRow));
  }
  if (error) {
    return {
      ok: false,
      error: "Something went wrong submitting your review.",
      status: 500,
    };
  }
  return { ok: true, verified: input.verified };
}
