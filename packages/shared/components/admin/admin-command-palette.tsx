"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { cn } from "@/lib/utils";

type Hit = {
  kind: string;
  label: string;
  href: string;
};

const ADMIN_QUICK_LINKS: Hit[] = [
  { kind: "page", label: "Home", href: "/admin" },
  { kind: "page", label: "Orders", href: "/admin/orders" },
  { kind: "page", label: "Products", href: "/admin/products" },
  { kind: "page", label: "Collections", href: "/admin/collections" },
  { kind: "page", label: "Blog", href: "/admin/blog" },
  { kind: "page", label: "Discounts", href: "/admin/discounts" },
  { kind: "page", label: "Customers", href: "/admin/customers" },
  { kind: "page", label: "Inbox", href: "/admin/inbox" },
  { kind: "page", label: "Settings", href: "/admin/settings" },
];

function filterQuickLinks(query: string): Hit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return ADMIN_QUICK_LINKS;
  return ADMIN_QUICK_LINKS.filter(
    (h) =>
      h.label.toLowerCase().includes(needle) ||
      h.href.toLowerCase().includes(needle.replace(/\s+/g, "")),
  );
}

export function AdminCommandPalette({ open, onOpenChange, returnFocusTo }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusTo: { current: HTMLElement | null };
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    setQ("");
    setHits(ADMIN_QUICK_LINKS);
    setActive(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const qTrim = q.trim();
    setSearchError(false);
    if (qTrim.length < 2) {
      setHits(filterQuickLinks(qTrim));
      setActive(0);
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    let current = true;
    setHits([]);
    setActive(0);
    setBusy(true);
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const data = (await adminFetch(
            `/api/admin/search?q=${encodeURIComponent(qTrim)}`,
            { signal: controller.signal },
          )) as { hits?: Hit[] };
          if (!current) return;
          setHits(data.hits ?? []);
          setActive(0);
        } catch {
          if (current) { setHits([]); setSearchError(true); }
        } finally {
          if (current) setBusy(false);
        }
      })();
    }, 150);
    return () => {
      current = false;
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [q, open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border shadow-lg"
          style={{ background: "var(--g-cream, #f5f1e8)" }}
          onOpenAutoFocus={(event) => { event.preventDefault(); inputRef.current?.focus(); }}
          onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusTo.current?.focus(); }}
        >
        <Dialog.Title className="sr-only">Search admin</Dialog.Title>
        <Dialog.Description className="sr-only">Find orders, products and customers, or jump to an admin page.</Dialog.Description>
        <Dialog.Close className="absolute right-2 top-2 rounded-md p-2" aria-label="Close search">
          <X className="h-4 w-4" />
        </Dialog.Close>
        <input
          ref={inputRef}
          className="w-full border-b bg-transparent py-3 pl-4 pr-12 text-sm outline-none"
          aria-label="Search orders, products and customers"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={hits[active] ? `${listId}-${active}` : undefined}
          placeholder="Search orders, products, customers…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && hits[active]) {
              e.preventDefault();
              // Use a real link so the shared unsaved-changes guard also sees
              // keyboard navigation instead of bypassing it via router.push.
              activeLinkRef.current?.click();
            }
          }}
        />
        <ul id={listId} role="listbox" aria-label="Search results" className="max-h-72 overflow-y-auto py-1">
          {hits.length === 0 ? (
            <li role="presentation" className="px-4 py-3 text-sm text-muted-foreground">
              <span role="status">{busy ? "Searching…" : searchError ? "Search is unavailable. Try again."
                : q.trim().length >= 2
                ? "No matches"
                : "Jump to a page or type 2+ characters to search"}</span>
            </li>
          ) : (
            hits.map((h, i) => (
              <li key={`${h.kind}-${h.href}`} role="presentation">
                <Link
                  href={h.href}
                  ref={i === active ? activeLinkRef : undefined}
                  role="option"
                  id={`${listId}-${i}`}
                  aria-selected={i === active}
                  tabIndex={-1}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2 text-left text-sm",
                    i === active && "bg-muted/50",
                  )}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => onOpenChange(false)}
                >
                  <span className="w-16 shrink-0 text-xs uppercase text-muted-foreground">
                    {h.kind}
                  </span>
                  <span className="truncate font-medium">{h.label}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Esc to close · ↑↓ · Enter
        </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
