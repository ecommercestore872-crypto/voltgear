import { NextResponse } from "next/server";

import { getOrdersByEmail } from "@/lib/order-store";
import { submitReview } from "@/lib/db/store";
import { isDemoRequest } from "@/lib/demo";
import { takePublicPostLimit } from "@/lib/public-api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReviewBody {
  slug?: string;
  rating?: number;
  name?: string;
  email?: string;
  comment?: string;
  image?: string;
  category?: string;
  productName?: string;
}

export async function POST(request: Request) {
  try {
    const limited = takePublicPostLimit(request, "review");
    if (!limited.ok) {
      return NextResponse.json({ error: limited.error }, { status: limited.status });
    }

    const body: ReviewBody = await request.json();
    const { slug, rating, name, email, comment, image, category, productName } =
      body;

    if (!slug) {
      return NextResponse.json({ error: "Missing product." }, { status: 400 });
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Please choose a rating between 1 and 5." },
        { status: 400 }
      );
    }
    if (!name?.trim() || !email?.trim() || !comment?.trim()) {
      return NextResponse.json(
        { error: "Name, email and review are required." },
        { status: 400 }
      );
    }

    const orders = await getOrdersByEmail(email.toLowerCase().trim());
    const verified = orders.some((o) =>
      (o.items ?? []).some((i) => i.slug === slug)
    );

    const result = await submitReview({
      slug,
      rating,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      comment: comment.trim(),
      image: image?.trim(),
      category: category?.trim(),
      productName: productName?.trim(),
      verified,
      isDemo: isDemoRequest(request),
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, verified: result.verified, duplicate: result.duplicate });
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json(
      { error: "Something went wrong submitting your review." },
      { status: 500 }
    );
  }
}
