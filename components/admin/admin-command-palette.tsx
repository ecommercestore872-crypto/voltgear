"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { adminFetch } from "@/components/admin/admin-fetch";
import { cn } from "@/lib/utils";

type Hit = {
  kind: string;
  label: string;
  href: string;
};

export function AdminCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setHits([]);
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const qTrim = q.trim();
    if (!qTrim) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const data = (await adminFetch(
            `/api/admin/search?q=${encodeURIComponent(qTrim)}`,
          )) as { hits?: Hit[] };
          setHits(data.hits ?? []);
          setActive(0);
        } catch {
          setHits([]);
        }
      })();
    }, 150);
    return () => window.clearTimeout(handle);
  }, [q, open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search admin"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border bg-[var(--g-cream)] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none"
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
              go(hits[active].href);
            }
          }}
        />
        <ul className="max-h-72 overflow-y-auto py-1">
          {hits.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              {q.trim()
                ? "No matches"
                : "Type an order #, product, or customer"}
            </li>
          ) : (
            hits.map((h, i) => (
              <li key={`${h.kind}-${h.href}`}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2 text-left text-sm",
                    i === active && "bg-muted/50",
                  )}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(h.href)}
                >
                  <span className="w-16 shrink-0 text-xs uppercase text-muted-foreground">
                    {h.kind}
                  </span>
                  <span className="truncate font-medium">{h.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Esc to close · ↑↓ · Enter
        </p>
      </div>
    </div>
  );
}
