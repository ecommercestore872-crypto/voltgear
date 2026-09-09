import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { listAdminPages } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Pages",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  const pages = await listAdminPages();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pages</h1>
        <Button asChild>
          <Link href="/admin/pages/new">New page</Link>
        </Button>
      </div>
      <ul className="divide-y rounded-lg border">
        {pages.map((page) => (
          <li key={String(page.id)}>
            <Link
              href={`/admin/pages/${page.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/40"
            >
              <span>
                <span className="block font-medium">{String(page.title)}</span>
                <span className="text-xs text-muted-foreground">
                  /{String(page.slug)}
                </span>
              </span>
              <span className="text-xs capitalize text-muted-foreground">
                {page.draft
                  ? `${page.status} · draft`
                  : String(page.status ?? "published")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
