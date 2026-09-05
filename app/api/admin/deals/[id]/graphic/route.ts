import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { dealGraphicHtml } from "@/lib/db/deal-graphic";
import { fetchDealCatalog, listProductDeals } from "@/lib/db/deal-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [deals, catalog] = await Promise.all([listProductDeals(), fetchDealCatalog()]);
  const deal = deals.find((row) => row.id === params.id);
  if (!deal) return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  const a = catalog.find((p) => p.slug === deal.slugA);
  const b = catalog.find((p) => p.slug === deal.slugB);
  if (!a || !b) return NextResponse.json({ error: "A product in this deal is missing." }, { status: 404 });
  const html = dealGraphicHtml(deal, a, b);
  const filename = `${deal.slugA}-${deal.slugB}-deal.html`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
