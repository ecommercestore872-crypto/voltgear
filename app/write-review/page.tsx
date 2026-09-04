import type { Metadata } from "next";

import { WriteReviewForm } from "@/components/reviews/write-review-form";
import { fetchReviewProducts } from "@/lib/db/store";
import { isDemoSession } from "@/lib/demo";
import type { Product } from "@/lib/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Write a Review",
  description:
    "Tell us what you think about your VoltGear purchase — attach a photo and it will appear on the product's review section.",
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
      <div className="mb-8 rounded-2xl bg-[#1C352D] p-8 sm:p-10 text-center shadow-lg">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F3D052] mb-3">
          Customer Feedback
        </p>
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl text-white">
          Write a review
        </h1>
        <p className="mt-4 mx-auto max-w-lg text-sm text-[#F3D052]/80 font-medium">
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
