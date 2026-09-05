import { NextResponse } from "next/server";

import { applyDealsToCart, normalizeDealSlug } from "@/lib/db/deal-rules";
import { fetchDealCatalog, listProductDeals } from "@/lib/db/deal-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const items = Array.isArray((body as { items?: unknown } | null)?.items)
    ? ((body as { items: { slug?: unknown; quantity?: unknown }[] }).items)
    : [];
  const [deals, catalog] = await Promise.all([listProductDeals(), fetchDealCatalog()]);
  const priceBySlug = new Map(catalog.map((p) => [p.slug, p.price]));
  const lines = items
    .map((item) => ({
      slug: normalizeDealSlug(item.slug),
      quantity: Number(item.quantity),
      price: priceBySlug.get(normalizeDealSlug(item.slug)) ?? 0,
    }))
    .filter((item) => item.slug && Number.isInteger(item.quantity) && item.quantity > 0 && item.price > 0);
  const result = applyDealsToCart(lines, deals.filter((d) => d.active));
  const merchandise = Math.round(lines.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100;
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
