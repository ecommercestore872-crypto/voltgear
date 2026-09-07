import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { listAdminPages } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Blog",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const pages = (await listAdminPages()).filter((page) => page.page_type === "blog");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Blog guides</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Write original buying guides, upload a cover, set SEO, then pin the order on the homepage.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/blog/new">New guide</Link>
        </Button>
      </div>
      {pages.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-sm text-muted-foreground">
          No blog posts yet. Publish a guide so /blog and the homepage have real pages for search and AdSense.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {pages.map((page) => {
            const seo = (page.seo ?? {}) as { featured?: boolean; homeOrder?: number };
            return (
              <li key={String(page.id)}>
                <Link
                  href={`/admin/blog/${page.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                >
                  <span>
                    <span className="block font-medium">{String(page.title)}</span>
                    <span className="text-xs text-muted-foreground">/blog/{String(page.slug)}</span>
                  </span>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">
                    {seo.featured ? `Pinned · ${seo.homeOrder ?? "—"} · ` : ""}
                    {page.draft ? `${page.status} · draft` : String(page.status ?? "published")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
