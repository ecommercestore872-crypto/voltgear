"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, Menu, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clearAdminToken } from "@/lib/admin-token";
import { completeAdminLogout } from "@/lib/admin-logout";
import { isAdminLoginPath } from "@/lib/storefront-layout-rules";
import { cn } from "@/lib/utils";

import { adminFetch } from "./admin-fetch";
const AdminCommandPalette = dynamic(
  () =>
    import("./admin-command-palette").then((m) => m.AdminCommandPalette),
  { ssr: false },
);

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
    label: "Storefront",
    items: [
      { href: "/admin/hero", label: "Hero" },
      { href: "/admin/home", label: "Home layout" },
      { href: "/admin/homepage-sections", label: "Homepage sections" },
      { href: "/admin/testimonials", label: "Testimonials" },
    ],
  },
  {
    label: "Merchandising",
    items: [
      { href: "/admin/discounts", label: "Discounts" },
      { href: "/admin/deals", label: "Deals" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/reviews", label: "Reviews" },
      { href: "/admin/blog", label: "Blog" },
      { href: "/admin/pages", label: "Pages" },
    ],
  },
  {
    label: "Comms",
    items: [
      { href: "/admin/inbox", label: "Inbox" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/newsletter", label: "Newsletter" },
      { href: "/admin/broadcast", label: "Messaging" },
    ],
  },
  {
    items: [
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/order-emails", label: "Order emails" },
      { href: "/admin/email-sending", label: "Email sending" },
      { href: "/admin/invoice", label: "Invoice" },
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
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const logoutInFlight = useRef(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);
  const searchReturnFocus = useRef<HTMLElement | null>(null);
  const changeSearchOpen = useCallback((next: boolean) => {
    if (next) setSearchMounted(true);
    if (next && document.activeElement instanceof HTMLElement) {
      searchReturnFocus.current = document.activeElement;
    }
    setSearchOpen(next);
  }, []);
  useEffect(() => {
    if (isAdminLoginPath(pathname)) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        changeSearchOpen(!searchOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, searchOpen, changeSearchOpen]);

  if (isAdminLoginPath(pathname)) {
    return <>{children}</>;
  }

  async function logout() {
    if (logoutInFlight.current) return;
    logoutInFlight.current = true;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await completeAdminLogout({
        request: () => adminFetch("/api/admin/logout", { method: "POST", signal: AbortSignal.timeout(30_000) }, { redirectOnUnauthorized: false }),
        clearLocalToken: clearAdminToken,
        // A full navigation discards Next's cached protected route payloads.
        navigate: () => window.location.replace("/admin/login"),
      });
    } catch {
      setLogoutError("Sign-out could not be confirmed. Please try again.");
      logoutInFlight.current = false;
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-dvh bg-[var(--g-cream)]">
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "admin-sidebar fixed inset-y-0 left-0 z-40 w-56 overflow-y-auto border-r p-4 md:static md:block",
          !open && "max-md:hidden",
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
                      active && "admin-nav-link-active",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <button type="button" onClick={() => changeSearchOpen(true)}
          className="admin-nav-link mt-6 w-full rounded-md px-3 py-2 text-left text-xs"
          aria-label="Search admin">
          Search · Ctrl/⌘ K
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="admin-sign-out mt-2 w-full justify-start hover:bg-transparent"
          onClick={logout}
          disabled={loggingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </Button>
        {logoutError ? <p role="alert" className="mt-2 text-xs text-destructive">{logoutError}</p> : null}
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
          <Button type="button" variant="outline" size="icon" className="ml-auto"
            aria-label="Search admin" onClick={() => changeSearchOpen(true)}>
            <Search className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex-1 overflow-x-auto p-4 lg:p-8">{children}</div>
      </div>
      {searchMounted ? <AdminCommandPalette open={searchOpen} onOpenChange={changeSearchOpen} returnFocusTo={searchReturnFocus} /> : null}
    </div>
  );
}
