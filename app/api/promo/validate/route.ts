import { NextResponse } from "next/server";
import { getPromoByCode, countPriorOrdersForEmail } from "@/lib/db/promo-store";
import { applyPromoToTotals } from "@/lib/db/promo-rules";
import { takePublicPostLimit } from "@/lib/public-api-guard";

export async function POST(request: Request) {
  try {
    const limited = takePublicPostLimit(request, "promo");
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: limited.error },
        { status: limited.status },
      );
    }

    const body = await request.json();
    const { code, subtotal, shipping } = body;
    const email =
      typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Code is required" },
        { status: 400 },
      );
    }

    const promo = await getPromoByCode(code);
    if (!promo) {
      return NextResponse.json({
        ok: false,
        error: "Promo code not found or invalid.",
      });
    }

    let isFirstOrder = true;
    if (promo.firstOrderOnly) {
      if (!email) {
        return NextResponse.json({
          ok: false,
          error:
            "Enter your email above first so we can check first-order codes.",
        });
      }
      const prior = await countPriorOrdersForEmail(email);
      isFirstOrder = prior === 0;
    }

    const result = applyPromoToTotals(promo, {
      subtotal: Number(subtotal ?? 0),
      shipping: Number(shipping ?? 0),
      isFirstOrder,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[promo validate endpoint] error:", error);
    return NextResponse.json(
      { ok: false, error: "An error occurred while checking promo code." },
      { status: 500 },
    );
  }
}
