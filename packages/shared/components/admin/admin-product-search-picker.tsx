"use client";

import { useEffect, useMemo, useState } from "react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AdminProductPickerOption = {
  id: string;
  name: string;
  slug?: string;
};

type Props = {
  label: string;
  value: string;
  onChange: (productId: string) => void;
  seedProducts?: AdminProductPickerOption[];
  placeholder?: string;
  required?: boolean;
};

/** Avoid rendering thousands of <option>s — search API + small seed list (current selection). */
export function AdminProductSearchPicker({
  label,
  value,
  onChange,
  seedProducts = [],
  placeholder = "Type 2+ characters to search products…",
  required,
}: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<AdminProductPickerOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const handle = window.setTimeout(() => {
      void adminFetch(`/api/admin/products?q=${encodeURIComponent(needle)}`)
        .then((json: { products?: { _id: string; name: string; slug?: string }[] }) => {
          setHits(
            (json.products ?? []).map((p) => ({
              id: p._id,
              name: p.name,
              slug: p.slug,
            })),
          );
        })
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => window.clearTimeout(handle);
  }, [q]);

  const options = useMemo(() => {
    const map = new Map<string, AdminProductPickerOption>();
    for (const p of seedProducts) map.set(p.id, p);
    for (const p of hits) map.set(p.id, p);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [seedProducts, hits]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select product…</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {loading ? (
        <p className="text-xs text-muted-foreground">Searching…</p>
      ) : q.trim().length >= 2 && !options.length ? (
        <p className="text-xs text-muted-foreground">No products match.</p>
      ) : null}
    </div>
  );
}
