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
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load"),
    );
  }, []);

  const name = (slug: string) =>
    catalog.find((p) => p.slug === slug)?.name ?? slug;

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
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
      {/* Command Center Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Bundle Deals
            </h1>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-orange-500/10 to-amber-500/10 text-orange-700 dark:text-orange-400 ring-1 ring-orange-500/30">
              Merchandising
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Configure automated bundle discounts (e.g., watch + strap). The discount always applies to the cheaper item. Price ratios must clear profit safeguards.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 mt-8">
        {/* Deal Configuration Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Build New Bundle</h2>
            
            <div className="space-y-4">
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-foreground">Primary Product (A)</span>
                <select
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  value={slugA}
                  onChange={(e) => setSlugA(e.target.value)}
                >
                  <option value="">Select component</option>
                  {catalog.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} · {formatPrice(p.price)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-foreground">Secondary Product (B)</span>
                <select
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  value={slugB}
                  onChange={(e) => setSlugB(e.target.value)}
                >
                  <option value="">Select component</option>
                  {catalog.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} · {formatPrice(p.price)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-foreground">% Off Cheaper Item</span>
                <Input
                  inputMode="numeric"
                  value={percentOff}
                  onChange={(e) => setPercentOff(e.target.value)}
                  placeholder="e.g. 15"
                />
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-foreground">Deal Title (Optional)</span>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Ultimate Setup"
                />
              </label>

              {error && <p className="text-sm p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
              
              <Button
                type="button"
                className="w-full font-bold shadow-sm"
                disabled={busy || !slugA || !slugB}
                onClick={() => void create()}
              >
                Assemble Deal
              </Button>
            </div>
          </div>
          
          {/* AI Suggestions (Only visible when available) */}
          {suggestions.length > 0 && (
            <div className="rounded-2xl border bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                 <span className="text-lg">✨</span>
                 <h2 className="font-semibold text-sm uppercase tracking-wider text-blue-900 dark:text-blue-300">Smart Pairs</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                 AI-detected combinations from historically delivered orders.
              </p>
              <div className="space-y-3">
                {suggestions.map((row) => (
                  <div
                    key={`${row.slugA}|${row.slugB}`}
                    className="group relative overflow-hidden rounded-xl border bg-card p-4 text-sm transition-all hover:shadow-md"
                  >
                    <p className="font-bold text-foreground">
                      {row.nameA} <span className="text-muted-foreground">+</span> {row.nameB}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatPrice(row.priceA)} + {formatPrice(row.priceB)}</span>
                      <span>·</span>
                      <span>Paired {row.deliveredTogether}x</span>
                    </div>
                    {row.reason && <p className="mt-2 text-xs italic text-muted-foreground leading-snug">{row.reason}</p>}
                    
                    {row.canCreate && (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 w-full bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300"
                        variant="secondary"
                        onClick={() => {
                          setSlugA(row.slugA);
                          setSlugB(row.slugB);
                          setPercentOff(
                            String(Math.min(10, row.maxSafePercent ?? 10)),
                          );
                          setTitle(`${row.nameA} & ${row.nameB}`);
                        }}
                      >
                        Apply Setup
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Directory List */}
        <div className="lg:col-span-8">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="p-4 border-b bg-muted/10">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Active Deals</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="border-b bg-muted/20">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Deal Identity</th>
                    <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Configuration</th>
                    <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide text-center">Status</th>
                    <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deals.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">
                        <div className="flex justify-center opacity-20 text-3xl mb-2">📦</div>
                        <p>No bundles configured.</p>
                      </td>
                    </tr>
                  ) : (
                    deals.map((deal) => (
                      <tr key={deal.id} className="group hover:bg-muted/10 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-foreground">{deal.title || "Custom Bundle"}</p>
                        </td>
                        <td className="px-5 py-4">
                           <div className="flex flex-col gap-1">
                             <span className="font-medium text-foreground truncate max-w-[200px]" title={`${name(deal.slugA)} + ${name(deal.slugB)}`}>
                               {name(deal.slugA)} <span className="text-muted-foreground mx-1">+</span> {name(deal.slugB)}
                             </span>
                             <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 w-fit px-1.5 py-0.5 rounded">
                               {deal.percentOff}% off cheaper
                             </span>
                           </div>
                        </td>
                        <td className="px-5 py-4 text-center align-middle">
                           {deal.active ? (
                             <span className="inline-flex py-0.5 px-2.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest ring-1 ring-emerald-500/20">Live</span>
                           ) : (
                             <span className="inline-flex py-0.5 px-2.5 rounded-full bg-gray-500/10 text-muted-foreground text-[10px] font-bold uppercase tracking-widest ring-1 ring-gray-500/20">Paused</span>
                           )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                className="text-xs font-semibold"
                                onClick={() => void toggleActive(deal)}
                              >
                                {deal.active ? "Pause" : "Resume"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs font-semibold hidden md:inline-flex"
                                onClick={() => void downloadGraphic(deal)}
                              >
                                HTML
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                disabled={busy}
                                onClick={() => void remove(deal)}
                              >
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
        </div>
      </div>
    </div>
  );
}
