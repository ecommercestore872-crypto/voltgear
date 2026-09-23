import type { Metadata } from "next";

import { ReviewsQueue } from "@/components/admin/reviews-queue";
import { listReviewSubmissions } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Reviews",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const reviews = await listReviewSubmissions();
  return <ReviewsQueue reviews={reviews as never} />;
}
