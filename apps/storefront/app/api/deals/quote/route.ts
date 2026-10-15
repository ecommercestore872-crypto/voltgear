import { withShopApiObservability } from "@/lib/shop-api-observability";
import { NextResponse } from "next/server";

import { applyDealsToCart, normalizeDealSlug } from "@/lib/db/deal-rules";
import { fetchDealCatalog, listProductDeals } from "@/lib/db/deal-store";
import { takeDealQuoteLimit } from "@/lib/public-api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function POSTHandler(request: Request) {
  const rate = takeDealQuoteLimit(request);
  if (!rate.ok) {
    return NextResponse.json({ error: rate.error }, { status: rate.status });
  }

  const body = await request.json().catch(() => null);
  const items = Array.isArray((body as { items?: unknown } | null)?.items)
    ? (body as { items: { slug?: unknown; quantity?: unknown }[] }).items
    : [];
  if (items.length > 50) {
    return NextResponse.json(
      { error: "Too many cart lines." },
      { status: 400 },
    );
  }
  const requestedUnits = items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    return sum + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
  if (requestedUnits > 500) {
    return NextResponse.json(
      { error: "Cart quantity is too large." },
      { status: 400 },
    );
  }
  const [deals, catalog] = await Promise.all([
    listProductDeals(),
    fetchDealCatalog(),
  ]);
  const priceBySlug = new Map(catalog.map((p) => [p.slug, p.price]));
  const lines = items
    .map((item) => ({
      slug: normalizeDealSlug(item.slug),
      quantity: Number(item.quantity),
      price: priceBySlug.get(normalizeDealSlug(item.slug)) ?? 0,
    }))
    .filter(
      (item) =>
        item.slug &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.price > 0,
    );
  const result = applyDealsToCart(
    lines,
    deals.filter((d) => d.active),
  );
  const merchandise =
    Math.round(lines.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100;
  return NextResponse.json({
    discount: result.discount,
    merchandise,
    applied: result.applied.map((row) => ({
      title: row.title,
      applications: row.applications,
      discount: row.discount,
    })),
  });
}

export const POST = withShopApiObservability("POST /api/deals/quote", POSTHandler);
