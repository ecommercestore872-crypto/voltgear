import { revalidatePath } from "next/cache";

import { isAdminRequest } from "@/lib/admin";
import { submitIndexNow } from "@/lib/indexnow-rules";
import { indexSiteUrl } from "@/lib/seo-rules";

export const dynamic = "force-dynamic";

const DEFAULT_PATHS = [
  "/",
  "/products",
  "/blog",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/shipping-returns",
  "/faq",
];

/**
 * On-demand ISR revalidation + IndexNow ping for Bing/partners.
 *   curl -X POST https://buyntryy.com/api/revalidate \
 *     -H "Authorization: Bearer <ADMIN_TOKEN>" \
 *     -H "Content-Type: application/json" -d '{"paths":["/","/products"]}'
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let paths: string[] = [];
    const body = await request.json().catch(() => null);
    if (body?.path && typeof body.path === "string") paths.push(body.path);
    else if (Array.isArray(body?.paths))
      paths = body.paths.filter((p: unknown) => typeof p === "string");
    else paths = DEFAULT_PATHS;

    for (const path of paths) revalidatePath(path);

    const indexNow = await submitIndexNow({
      siteUrl: indexSiteUrl(),
      urls: paths,
    });

    return Response.json({
      revalidated: true,
      paths,
      indexNow,
      now: Date.now(),
    });
  } catch (err) {
    return Response.json(
      {
        revalidated: false,
        error: err instanceof Error ? err.message : "Failed to revalidate",
      },
      { status: 500 },
    );
  }
}
