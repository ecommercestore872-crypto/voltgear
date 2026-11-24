"use client";

import dynamic from "next/dynamic";

/** Write-a-review form is below the fold and not SEO content: fetch its JS after hydration. */
export const ReviewFormLazy = dynamic(
  () => import("@/components/product/review-form").then((m) => m.ReviewForm),
  { ssr: false, loading: () => <div className="min-h-[26rem]" aria-hidden /> },
);
