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
import { AdminCommandPalette } from "./admin-command-palette";

type NavLink = { href: string; label: string; exact?: boolean };
type NavGroup = { label?: string; items: NavLink[] };

/** Shopify-style groups — only links that already exist (no empty stubs). */
const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/admin", label: "Home", exact: true },
      { href: "/admin/orders", label: "Orders" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/categories", label: "Shop types" },
      { href: "/admin/collections", label: "Collections" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages" },
      { href: "/admin/hero", label: "Hero" },
      { href: "/admin/home", label: "Home layout" },
      { href: "/admin/testimonials", label: "Testimonials" },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/admin/inbox", label: "Inbox" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/newsletter", label: "Newsletter" },
      { href: "/admin/reviews", label: "Reviews" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/broadcast", label: "Messaging" },
      { href: "/admin/discounts", label: "Discounts" },
    ],
  },
  {
    items: [
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/order-emails", label: "Order emails" },
      { href: "/admin/autopilot/settings", label: "Autopilot" },
    ],
  },
];

function linkActive(pathname: string, item: NavLink) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

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
    <div className="flex min-h-dvh bg-[var(--g-cream)]">
      <aside
        className={cn(
          "admin-sidebar fixed inset-y-0 left-0 z-40 w-56 overflow-y-auto border-r p-4 md:static md:block",
          !open && "max-md:hidden"
        )}
      >
        <p className="admin-sidebar-brand mb-6 text-sm font-semibold tracking-tight">
          Store admin
        </p>
        <nav className="space-y-4" aria-label="Admin">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label ?? `g-${gi}`} className="space-y-1">
              {group.label ? (
                <p className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--g-taupe)]">
                  {group.label}
                </p>
              ) : null}
              {group.items.map((item) => {
                const active = linkActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "admin-nav-link block rounded-md px-3 py-2 text-sm transition-colors",
                      active && "admin-nav-link-active"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <p className="mt-6 px-3 text-[0.65rem] text-[var(--g-taupe)]">
          Search · Ctrl/⌘ K
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="admin-sign-out mt-2 w-full justify-start hover:bg-transparent"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </aside>
      <div className="admin-main flex min-w-0 flex-1 flex-col">
        <header className="admin-mobile-bar flex items-center gap-2 border-b px-4 py-3 md:hidden">
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
      <AdminCommandPalette />
    </div>
  );
}
