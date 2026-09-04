import type { Metadata } from "next";

import { WriteReviewForm } from "@/components/reviews/write-review-form";
import { fetchReviewProducts } from "@/lib/db/store";
import { isDemoSession } from "@/lib/demo";
import type { Product } from "@/lib/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Write a Review",
  description:
    "Tell us what you think about your Buy n Try purchase — attach a photo and it will appear on the product's review section.",
};

interface ReviewProduct {
  _id: string;
  slug: string;
  name: string;
  category: string;
  image?: string | null;
}

export default async function WriteReviewPage() {
  let products: ReviewProduct[] = [];
  try {
    products = await fetchReviewProducts(isDemoSession());
  } catch {
    products = [];
  }

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 lg:px-8">
      <div className="mb-8 border-b border-[var(--g-line)] pb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g-sage)] mb-3">
          Reviews
        </p>
        <h1 className="gadget-display text-3xl tracking-[-0.03em] text-[var(--g-charcoal)] sm:text-4xl">
          Write a review
        </h1>
        <p className="mt-3 max-w-lg text-sm text-[var(--g-taupe)]">
          Picked up your order recently? Choose the product you bought, rate it
          and attach a photo — your review appears directly under the product.
        </p>
      </div>

      <WriteReviewForm
        products={products as Product[]}
        categories={categories}
      />
    </div>
  );
}
