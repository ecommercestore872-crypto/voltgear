"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clearAdminToken } from "@/lib/admin-token";
import { isAdminLoginPath } from "@/lib/storefront-layout-rules";
import { cn } from "@/lib/utils";

import { adminFetch } from "./admin-fetch";

const NAV = [
  { href: "/admin", label: "Home", exact: true },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Shop types" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/hero", label: "Hero" },
  { href: "/admin/home", label: "Home layout" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/broadcast", label: "Messaging" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (isAdminLoginPath(pathname)) {
    return <>{children}</>;
  }

  async function logout() {
    try {
      await adminFetch("/api/admin/logout", { method: "POST" });
    } catch {
      // still clear local token
    }
    clearAdminToken();
    router.replace("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-56 border-r bg-card p-4 md:static md:block",
          !open && "max-md:hidden"
        )}
      >
        <p className="mb-6 text-sm font-semibold tracking-tight">Store admin</p>
        <nav className="space-y-1" aria-label="Admin">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Button variant="ghost" size="sm" className="mt-8 w-full justify-start" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-4 py-3 md:hidden">
          <Button
            variant="outline"
            size="icon"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <span className="text-sm font-medium">Admin</span>
        </header>
        <div className="flex-1 p-4 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
