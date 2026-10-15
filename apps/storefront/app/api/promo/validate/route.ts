import { withShopApiObservability } from "@/lib/shop-api-observability";
import { NextResponse } from "next/server";
import { getPromoByCode, countPriorOrdersForEmail } from "@/lib/db/promo-store";
import { applyPromoToTotals } from "@/lib/db/promo-rules";
import { takePublicPostLimit } from "@/lib/public-api-guard";

async function POSTHandler(request: Request) {
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

    const numericSubtotal = Number(subtotal);
    const numericShipping = Number(shipping);
    if (
      !Number.isFinite(numericSubtotal) ||
      !Number.isFinite(numericShipping) ||
      numericSubtotal < 0 ||
      numericShipping < 0 ||
      numericSubtotal > 1_000_000_000 ||
      numericShipping > 1_000_000_000
    ) {
      return NextResponse.json(
        { ok: false, error: "Cart totals are invalid." },
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
      subtotal: numericSubtotal,
      shipping: numericShipping,
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

export const POST = withShopApiObservability("POST /api/promo/validate", POSTHandler);
