import { NextResponse } from "next/server";

import { adsTxtBody } from "@/lib/adsense-policy";
import { STOREFRONT_LEGAL_REVALIDATE } from "@/lib/storefront-cache";

export const revalidate = STOREFRONT_LEGAL_REVALIDATE;

export function GET() {
  const body = adsTxtBody(process.env.NEXT_PUBLIC_ADSENSE_PUB_ID);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": `public, s-maxage=${STOREFRONT_LEGAL_REVALIDATE}, stale-while-revalidate=86400`,
    },
  });
}
