"use client";

import { useEffect, useState } from "react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { adminHeaders } from "@/lib/admin-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

type Deal = {
  id: string;
  title: string;
  slugA: string;
  slugB: string;
  percentOff: number;
  active: boolean;
};

type CatalogItem = { slug: string; name: string; price: number };

type Suggestion = {
  slugA: string;
  slugB: string;
  nameA: string;
  nameB: string;
  priceA: number;
  priceB: number;
  deliveredTogether: number;
  canCreate: boolean;
  maxSafePercent: number | null;
  reason: string;
};

export function DealsManager() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [slugA, setSlugA] = useState("");
  const [slugB, setSlugB] = useState("");
  const [percentOff, setPercentOff] = useState("10");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = (await adminFetch("/api/admin/deals")) as {
      deals?: Deal[];
      catalog?: CatalogItem[];
      suggestions?: Suggestion[];
    };
    setDeals(data.deals ?? []);
    setCatalog(data.catalog ?? []);
    setSuggestions(data.suggestions ?? []);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const name = (slug: string) => catalog.find((p) => p.slug === slug)?.name ?? slug;

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/admin/deals", {
        method: "POST",
        body: JSON.stringify({
          slugA,
          slugB,
          percentOff: Number(percentOff),
          title: title.trim() || undefined,
          active: true,
        }),
      });
      setTitle("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(deal: Deal) {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/deals/${deal.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          slugA: deal.slugA,
          slugB: deal.slugB,
          percentOff: deal.percentOff,
          title: deal.title,
          active: !deal.active,
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(deal: Deal) {
    if (!confirm(`Delete deal "${deal.title}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/deals/${deal.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadGraphic(deal: Deal) {
    setError(null);
    const res = await fetch(`/api/admin/deals/${deal.id}/graphic`, {
      credentials: "include",
      headers: adminHeaders(),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? "Could not download graphic.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${deal.slugA}-${deal.slugB}-deal.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Deals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Named pairs only. Percent comes off the cheaper item. A Rs 2,500 + Rs 200 pair cannot
          unlock the off — the cheaper item must be at least 40% of the dearer one, and Coach
          cost must still clear the safe floor.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">New pair deal</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Product one</span>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={slugA}
              onChange={(e) => setSlugA(e.target.value)}
            >
              <option value="">Select</option>
              {catalog.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} · {formatPrice(p.price)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Product two</span>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={slugB}
              onChange={(e) => setSlugB(e.target.value)}
            >
              <option value="">Select</option>
              {catalog.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} · {formatPrice(p.price)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">% off cheaper item</span>
            <Input
              inputMode="numeric"
              value={percentOff}
              onChange={(e) => setPercentOff(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Title (optional)</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Watch + strap" />
          </label>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="button" disabled={busy || !slugA || !slugB} onClick={() => void create()}>
          Create deal
        </Button>
      </div>

      {suggestions.length ? (
        <section className="space-y-3">
          <h2 className="font-semibold">Suggested pairs</h2>
          <p className="text-sm text-muted-foreground">
            From delivered orders only. Cancelled parcels do not count. Unbalanced or below-floor
            pairs stay listed so you can see why they were skipped.
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {suggestions.map((row) => (
              <li key={`${row.slugA}|${row.slugB}`} className="rounded-lg border bg-white p-4 text-sm">
                <p className="font-medium text-[var(--g-charcoal)]">
                  {row.nameA} + {row.nameB}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {formatPrice(row.priceA)} + {formatPrice(row.priceB)} · delivered together{" "}
                  {row.deliveredTogether} time{row.deliveredTogether === 1 ? "" : "s"}
                </p>
                <p className="mt-2">{row.reason}</p>
                {row.canCreate ? (
                  <Button
                    type="button"
                    className="mt-3"
                    variant="outline"
                    onClick={() => {
                      setSlugA(row.slugA);
                      setSlugB(row.slugB);
                      setPercentOff(String(Math.min(10, row.maxSafePercent ?? 10)));
                      setTitle(`${row.nameA} + ${row.nameB}`);
                    }}
                  >
                    Use this pair
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-2">Deal</th>
              <th className="px-3 py-2">Pair</th>
              <th className="px-3 py-2">Off</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-muted-foreground">
                  No pair deals yet. Start from a suggestion or pick two products above.
                </td>
              </tr>
            ) : (
              deals.map((deal) => (
                <tr key={deal.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{deal.title}</td>
                  <td className="px-3 py-2">
                    {name(deal.slugA)} + {name(deal.slugB)}
                  </td>
                  <td className="px-3 py-2">{deal.percentOff}% cheaper item</td>
                  <td className="px-3 py-2">{deal.active ? "Live" : "Paused"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void toggleActive(deal)}>
                        {deal.active ? "Pause" : "Go live"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void downloadGraphic(deal)}>
                        HTML graphic
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void remove(deal)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
