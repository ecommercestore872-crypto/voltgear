"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COLLECTION_HOME_SLOTS } from "@/lib/db/collection-rules";
import type { AdminCollection } from "@/lib/db/collection-store";
import type { AdminProduct } from "@/lib/db/admin-types";

export function CollectionEditor({
  initial,
  products,
}: {
  initial: AdminCollection;
  products: AdminProduct[];
}) {
  const [doc, setDoc] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.productIds),
  );
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.slug.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle),
    );
  }, [products, q]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const data = (await adminFetch(`/api/admin/collections/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: doc.name,
          slug: doc.slug,
          description: doc.description ?? "",
          mode: doc.mode,
          autoRule: doc.autoRule,
          homeSlot: doc.homeSlot,
          active: doc.active,
          productIds: Array.from(selected),
        }),
      })) as { collection?: AdminCollection };
      if (!data.collection) throw new Error("Save failed");
      setDoc(data.collection);
      setSelected(new Set(data.collection.productIds));
      setMsg("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/collections"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Collections
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{doc.name}</h1>
        </div>
        <Button type="button" disabled={busy} onClick={save}>
          Save
        </Button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {msg ? <p className="text-sm text-[var(--g-forest)]">{msg}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Name</span>
          <Input
            value={doc.name}
            onChange={(e) => setDoc((d) => ({ ...d, name: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Slug</span>
          <Input
            value={doc.slug}
            onChange={(e) => setDoc((d) => ({ ...d, slug: e.target.value }))}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={doc.active}
          onChange={(e) => setDoc((d) => ({ ...d, active: e.target.checked }))}
        />
        Active on storefront
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Home placement</span>
        <select
          className="w-full rounded-md border px-3 py-2"
          value={doc.homeSlot ?? ""}
          onChange={(e) =>
            setDoc((d) => ({
              ...d,
              homeSlot: (e.target.value || null) as AdminCollection["homeSlot"],
            }))
          }
        >
          <option value="">Not on home (use Home layout only)</option>
          {COLLECTION_HOME_SLOTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Feeds that rail’s products. Toggle/reorder the rail itself under
          Content → Home layout.
        </span>
      </label>
      <p className="text-sm text-muted-foreground">
        Mode: <strong>{doc.mode}</strong>
        {doc.autoRule ? ` · rule ${doc.autoRule}` : null}
      </p>

      {doc.mode === "manual" ? (
        <div className="space-y-3">
          <h2 className="font-medium">Products in this collection</h2>
          <Input
            placeholder="Filter products"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filter products"
          />
          <ul className="max-h-[28rem] space-y-1 overflow-y-auto rounded-lg border bg-white p-2">
            {filtered.map((p) => (
              <li key={p._id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={selected.has(p._id)}
                    onChange={() => toggle(p._id)}
                  />
                  <span className="text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {p.category}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            {selected.size} selected
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Auto collections pick products from the {doc.autoRule} rule. No manual
          picks needed.
        </p>
      )}
    </div>
  );
}
