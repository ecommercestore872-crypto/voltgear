import { withShopApiObservability } from "@/lib/shop-api-observability";
import { NextResponse } from "next/server";

import { getOrdersByEmail } from "@/lib/order-store";
import { submitReview } from "@/lib/db/store";
import { isDemoRequest } from "@/lib/demo";
import { takePublicPostLimit } from "@/lib/public-api-guard";
import { normalizePublicReview } from "@/lib/review-submission-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function POSTHandler(request: Request) {
  try {
    const limited = takePublicPostLimit(request, "review");
    if (!limited.ok) {
      return NextResponse.json(
        { error: limited.error },
        { status: limited.status },
      );
    }

    const body = await request.json();
    const parsed = normalizePublicReview(
      body,
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    );
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 },
      );
    }
    const { slug, rating, name, email, comment, image } = parsed.value;

    const orders = await getOrdersByEmail(email);
    const verified = orders.some((o) =>
      (o.items ?? []).some((i) => i.slug === slug),
    );

    const result = await submitReview({
      slug,
      rating,
      name,
      email,
      comment,
      image,
      verified,
      isDemo: isDemoRequest(request),
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json({
      ok: true,
      verified: result.verified,
      duplicate: result.duplicate,
    });
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json(
      { error: "Something went wrong submitting your review." },
      { status: 500 },
    );
  }
}

export const POST = withShopApiObservability("POST /api/reviews", POSTHandler);
