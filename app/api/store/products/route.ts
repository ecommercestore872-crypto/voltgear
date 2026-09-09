import { NextResponse } from "next/server";

import {
  fetchAllProducts,
  fetchFeaturedByCategory,
  fetchProductBySlug,
} from "@/lib/db/store";
import { isDemoRequest } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const demo = isDemoRequest(request);
    if (slug) {
      const product = await fetchProductBySlug(slug, demo);
      return json(product);
    }
    if (category && featured === "1") {
      const products = await fetchFeaturedByCategory(category, 4, demo);
      return json(products);
    }
    const products = await fetchAllProducts(demo);
    return json(products);
  } catch (err) {
    console.error("[store/products]", err);
    return json([], 500);
  }
}
