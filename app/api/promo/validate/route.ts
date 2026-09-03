import { NextResponse } from "next/server";
import { getPromoByCode } from "@/lib/db/promo-store";
import { applyPromoToTotals } from "@/lib/db/promo-rules";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, subtotal, shipping } = body;

    if (!code) {
      return NextResponse.json({ ok: false, error: "Code is required" }, { status: 400 });
    }

    const promo = await getPromoByCode(code);
    if (!promo) {
      return NextResponse.json({ ok: false, error: "Promo code not found or invalid." });
    }

    // Apply rules (checking active, dates, calculating totals)
    // We assume isFirstOrder to true for guest checkout currently
    const result = applyPromoToTotals(promo, {
      subtotal: Number(subtotal ?? 0),
      shipping: Number(shipping ?? 0),
      isFirstOrder: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[promo validate endpoint] error:", error);
    return NextResponse.json(
      { ok: false, error: "An error occurred while checking promo code." },
      { status: 500 }
    );
  }
}
