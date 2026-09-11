import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FolderTree, Package, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ShopType } from "@/lib/categories";
import { listAdminShopTypes } from "@/lib/db/admin-store";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Shop Categories | Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  let shopTypes: ShopType[] = [];
  let loadError: string | null = null;
  try {
    shopTypes = await listAdminShopTypes();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Could not load shop types.";
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
      {/* SaaS Command Center Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Shop Categories
            </h1>
            <Badge variant="outline" className="bg-muted/30 hidden sm:inline-flex rounded-full tracking-widest text-[10px] uppercase font-bold text-muted-foreground ring-1 ring-border">
              Taxonomy Manager
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Structure your storefront taxonomy. Create new sub-departments, control navigation visibility, and organize your vast product catalog into perfect collections.
          </p>
        </div>

        <Button asChild className="shrink-0 shadow-sm sm:w-auto w-full group">
          <Link href="/admin/categories/new">
            <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
            Add Category
          </Link>
        </Button>
      </div>

      {loadError ? (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm">
          {loadError}
        </div>
      ) : null}
      
      {!loadError && shopTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed bg-muted/20">
          <FolderTree className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No Categories Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You haven't structured your product catalog yet. Create your first shop department to begin.
          </p>
        </div>
      ) : null}

      {shopTypes.length > 0 && (
        <div className="space-y-4">
          {/* Mobile Card Layout */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {shopTypes.map((t) => (
              <div 
                key={t.id ?? t.slug}
                className="flex flex-col p-4 rounded-xl bg-card border shadow-sm transition-all hover:border-primary/50"
              >
                <div className="flex justify-between items-start mb-3">
                  <Link
                    href={t.id ? `/admin/categories/${t.id}` : "/admin/categories"}
                    className="font-bold text-base hover:text-primary transition-colors line-clamp-1"
                  >
                    {t.name}
                  </Link>
                  {t.active === false ? (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700 dark:text-gray-300 ring-1 ring-gray-500/30 flex-shrink-0">
                      Hidden
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30 flex-shrink-0">
                      Active
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground mt-auto">
                  <div className="text-xs font-mono bg-muted/40 px-2 py-1 rounded-md">/{t.slug}</div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Package className="h-3.5 w-3.5 opacity-70" />
                    {t.productCount ?? 0}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-hidden rounded-xl border bg-card shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground tracking-wide text-xs uppercase">Category Name</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground tracking-wide text-xs uppercase">Slug</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground tracking-wide text-xs uppercase text-right">Products</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground tracking-wide text-xs uppercase w-[150px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shopTypes.map((t) => (
                  <tr key={t.id ?? t.slug} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 align-middle">
                      <Link
                        href={t.id ? `/admin/categories/${t.id}` : "/admin/categories"}
                        className="font-semibold text-foreground hover:text-primary transition-colors inline-block"
                      >
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 align-middle">
                       <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded-md border border-border/50">
                         /{t.slug}
                       </span>
                    </td>
                    <td className="px-5 py-4 align-middle text-right">
                       <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                         {t.productCount ?? 0}
                       </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      {t.active === false ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700 dark:text-gray-300 ring-1 ring-gray-500/30">
                          <EyeOff className="w-3 h-3" />
                          Hidden
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30 shadow-sm">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
