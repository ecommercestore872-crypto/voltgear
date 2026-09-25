import { isAdminRequest } from "@/lib/admin";
import { FALLBACK_BLOG_POSTS } from "@/lib/blog-data";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import { fetchBlogPosts, fetchShopTypes } from "@/lib/db/store";
import { priorityIndexNowPaths, submitIndexNow } from "@/lib/indexnow-rules";
import { indexSiteUrl } from "@/lib/seo-rules";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let urls: string[] = [];

  if (Array.isArray(body?.urls)) {
    urls = body.urls.filter((u: unknown) => typeof u === "string");
  } else if (Array.isArray(body?.paths)) {
    urls = body.paths.filter((p: unknown) => typeof p === "string");
  } else {
    const [types, blogs] = await Promise.all([
      fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES),
      fetchBlogPosts().catch(() => FALLBACK_BLOG_POSTS),
    ]);
    urls = priorityIndexNowPaths({
      categorySlugs: (types.length ? types : FALLBACK_SHOP_TYPES).map(
        (t) => t.slug,
      ),
      blogSlugs: (blogs.length ? blogs : FALLBACK_BLOG_POSTS).map(
        (p) => p.slug,
      ),
    });
  }

  const result = await submitIndexNow({
    siteUrl: indexSiteUrl(),
    urls,
  });

  return Response.json(result, { status: result.ok ? 200 : 502 });
}
