import { NextResponse } from "next/server";

import { adsTxtBody } from "@/lib/adsense-policy";

export const dynamic = "force-dynamic";

export function GET() {
  const body = adsTxtBody(process.env.NEXT_PUBLIC_ADSENSE_PUB_ID);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
