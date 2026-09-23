"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AdminStickyPublishBar } from "@/components/admin/admin-sticky-publish-bar";
import { adminFetch } from "@/components/admin/admin-fetch";
import { useAdminFormDirty } from "@/components/admin/use-admin-form-dirty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COLLECTION_HOME_SLOTS } from "@/lib/db/collection-rules";
import type { AdminCollection } from "@/lib/db/collection-store";
import type { AdminProduct } from "@/lib/db/admin-types";

export function CollectionEditor({
  initial,
  selectedProducts,
}: {
  initial: AdminCollection;
  selectedProducts: AdminProduct[];
}) {
  const [doc, setDoc] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.productIds),
  );
  const [q, setQ] = useState("");
  const [searchHits, setSearchHits] = useState<AdminProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editSnapshot = useMemo(
    () => ({
      name: doc.name,
      slug: doc.slug,
      description: doc.description ?? "",
      homeSlot: doc.homeSlot ?? null,
      active: doc.active,
      productIds: [...selected].sort(),
    }),
    [doc, selected],
  );
  const { dirty, resetSaved, syncSaved } = useAdminFormDirty(editSnapshot);

  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      setSearchHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = window.setTimeout(() => {
      void adminFetch(`/api/admin/products?q=${encodeURIComponent(needle)}`)
        .then((json: { products?: AdminProduct[] }) => {
          setSearchHits(json.products ?? []);
        })
        .catch(() => setSearchHits([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => window.clearTimeout(handle);
  }, [q]);

  const selectedById = useMemo(() => {
    const map = new Map<string, AdminProduct>();
    for (const p of selectedProducts) map.set(p._id, p);
    for (const p of searchHits) map.set(p._id, p);
    return map;
  }, [selectedProducts, searchHits]);

  const pickerList = useMemo(() => {
    const needle = q.trim();
    if (needle.length >= 2) return searchHits;
    return selectedProducts.filter((p) => selected.has(p._id));
  }, [q, searchHits, selectedProducts, selected]);

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
      resetSaved({
        name: data.collection.name,
        slug: data.collection.slug,
        description: data.collection.description ?? "",
        homeSlot: data.collection.homeSlot ?? null,
        active: data.collection.active,
        productIds: [...data.collection.productIds].sort(),
      });
      syncSaved();
      setMsg("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminStickyPublishBar>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Status:{" "}
            <span className="font-medium text-foreground">
              {dirty ? "Unsaved changes" : "Up to date"}
            </span>
          </p>
          <Button type="button" disabled={busy} onClick={save}>
            Save
          </Button>
        </div>
      </AdminStickyPublishBar>

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
          Feeds that rail’s products. Toggle/reorder the rail itself under Content →
          Home layout.
        </span>
      </label>
      <p className="text-sm text-muted-foreground">
        Mode: <strong>{doc.mode}</strong>
        {doc.autoRule ? ` · rule ${doc.autoRule}` : null}
      </p>

      {doc.mode !== "manual" ? (
        <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          This is an automatic collection — products are chosen by the{" "}
          <strong>{doc.autoRule ?? "rule"}</strong> rule. Switch to manual mode in
          Collections settings if you need to pick products by hand.
        </p>
      ) : (
        <div className="space-y-3">
          <h2 className="font-medium">Products in this collection</h2>
          <Input
            placeholder="Search catalog (2+ characters)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search products"
          />
          {q.trim().length < 2 ? (
            <p className="text-xs text-muted-foreground">
              Type at least 2 characters to search the full catalog. Below: products
              already in this collection ({selected.size} selected).
            </p>
          ) : searching ? (
            <p className="text-xs text-muted-foreground">Searching…</p>
          ) : null}
          <ul className="max-h-[28rem] space-y-1 overflow-y-auto rounded-lg border bg-white p-2">
            {pickerList.map((p) => (
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
            {pickerList.length === 0 && q.trim().length >= 2 && !searching ? (
              <li className="px-2 py-4 text-sm text-muted-foreground">No matches.</li>
            ) : null}
          </ul>
          {selected.size > 0 ? (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="font-medium">{selected.size} selected</p>
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {[...selected].map((id) => (
                  <li key={id}>{selectedById.get(id)?.name ?? id}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
