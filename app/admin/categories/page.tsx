import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ShopType } from "@/lib/categories";
import { listAdminShopTypes } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Shop types",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  let shopTypes: ShopType[] = [];
  let loadError: string | null = null;
  try {
    shopTypes = await listAdminShopTypes();
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Could not load shop types.";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Shop types</h1>
        <Button asChild>
          <Link href="/admin/categories/new">Add shop type</Link>
        </Button>
      </div>
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : null}
      {!loadError && shopTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add your first shop type.
        </p>
      ) : null}
      {shopTypes.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Products</th>
              </tr>
            </thead>
            <tbody>
              {shopTypes.map((t) => (
                <tr key={t.id ?? t.slug} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <Link
                      href={
                        t.id ? `/admin/categories/${t.id}` : "/admin/categories"
                      }
                      className="font-medium hover:underline"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {t.active === false ? (
                      <span className="inline-block rounded-full bg-muted/60 text-muted-foreground border px-2 py-0.5 text-xs">
                        Hidden
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50 px-2 py-0.5 text-xs">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{t.productCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
