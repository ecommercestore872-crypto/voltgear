"use client";

import { useEffect, useState } from "react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Promo = {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  firstOrderOnly: boolean;
  active: boolean;
  usageCount: number;
};

export function PromosManager() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [code, setCode] = useState("");
  const [type, setType] = useState<Promo["type"]>("percent");
  const [value, setValue] = useState("10");
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = (await adminFetch("/api/admin/promos")) as {
        promos?: Promo[];
      };
      setPromos(data.promos ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/admin/promos", {
        method: "POST",
        body: JSON.stringify({
          code,
          type,
          value: type === "free_shipping" ? 0 : Number(value),
          firstOrderOnly,
          active: true,
        }),
      });
      setCode("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p: Promo) {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/promos/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          code: p.code,
          type: p.type,
          value: p.value,
          firstOrderOnly: p.firstOrderOnly,
          active: !p.active,
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function deletePromo(p: Promo) {
    if (!confirm(`Delete code "${p.code}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/promos/${p.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      {/* Command Center Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Discounts & Promos
            </h1>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-teal-500/10 to-emerald-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/30">
              Marketing
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Manage checkout promo codes and campaign discounts. 
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 mt-8">
        {/* Creator Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Mint New Code</h2>
            
            <div className="space-y-4">
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-foreground">Code String</span>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HALFOFF2026"
                  className="uppercase font-mono font-bold tracking-widest placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:tracking-normal"
                />
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-foreground">Discount Type</span>
                <select
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  value={type}
                  onChange={(e) => setType(e.target.value as Promo["type"])}
                >
                  <option value="percent">Percentage Off (%)</option>
                  <option value="fixed">Fixed Amount Off</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>
              </label>

              {type !== "free_shipping" && (
                <label className="block space-y-1.5 text-sm">
                  <span className="font-semibold text-foreground">
                    {type === "percent" ? "Percentage Value" : "Amount (PKR)"}
                  </span>
                  <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    inputMode="decimal"
                    placeholder={type === "percent" ? "15" : "1500"}
                  />
                </label>
              )}

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-primary accent-primary"
                  checked={firstOrderOnly}
                  onChange={(e) => setFirstOrderOnly(e.target.checked)}
                />
                <span className="font-medium text-foreground">Valid for first-time orders only</span>
              </label>

              {error && <p className="text-sm p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
              
              <Button
                type="button"
                className="w-full font-bold shadow-sm"
                disabled={busy || !code.trim()}
                onClick={() => void create()}
              >
                Assemble & Publish Promo
              </Button>
            </div>
          </div>
        </div>

        {/* Directory List */}
        <div className="lg:col-span-8">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="p-4 border-b bg-muted/10">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Active Directory</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="border-b bg-muted/20">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Promo Code</th>
                    <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Type & Value</th>
                    <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide text-center">Status</th>
                    <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide text-center">Uses</th>
                    <th className="px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {promos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                        <div className="flex justify-center opacity-20 text-3xl mb-2">🏷️</div>
                        <p>No active promotions.</p>
                      </td>
                    </tr>
                  ) : (
                    promos.map((p) => (
                      <tr key={p.id} className="group hover:bg-muted/10 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold tracking-wider text-foreground">
                          {p.code}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">
                              {p.type === "free_shipping"
                                ? "Free Shipping"
                                : p.type === "percent"
                                  ? `${p.value}% Off`
                                  : `${p.value} PKR Off`}
                            </span>
                            {p.firstOrderOnly && (
                               <span className="text-[10px] font-bold uppercase tracking-wider text-primary">First Order Only</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center align-middle">
                           {p.active ? (
                             <span className="inline-flex py-0.5 px-2.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest ring-1 ring-emerald-500/20">Active</span>
                           ) : (
                             <span className="inline-flex py-0.5 px-2.5 rounded-full bg-gray-500/10 text-muted-foreground text-[10px] font-bold uppercase tracking-widest ring-1 ring-gray-500/20">Disabled</span>
                           )}
                        </td>
                        <td className="px-5 py-4 text-center font-mono font-medium text-muted-foreground">
                          {p.usageCount}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => void toggleActive(p)}
                              className="text-xs font-semibold"
                            >
                              {p.active ? "Pause" : "Resume"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                              disabled={busy}
                              onClick={() => void deletePromo(p)}
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
