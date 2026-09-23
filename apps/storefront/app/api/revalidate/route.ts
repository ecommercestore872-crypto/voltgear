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
    type RevalidateEntry = { path: string; type?: "layout" | "page" };
    let entries: RevalidateEntry[] = [];
    const body = await request.json().catch(() => null);
    if (body?.path && typeof body.path === "string") {
      entries.push({ path: body.path });
    } else if (Array.isArray(body?.paths)) {
      entries = body.paths
        .map((p: unknown) => {
          if (typeof p === "string") return { path: p };
          if (p && typeof p === "object" && "path" in p) {
            const row = p as { path?: unknown; type?: unknown };
            if (typeof row.path === "string") {
              return {
                path: row.path,
                type:
                  row.type === "layout" || row.type === "page"
                    ? row.type
                    : undefined,
              };
            }
          }
          return null;
        })
        .filter(Boolean) as RevalidateEntry[];
    } else {
      entries = DEFAULT_PATHS.map((path) => ({ path }));
    }

    for (const { path, type } of entries) revalidatePath(path, type);
    const paths = entries.map((e) => e.path);

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
