"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminCollection } from "@/lib/db/collection-store";

export function CollectionsManager({
  initial,
}: {
  initial: AdminCollection[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [autoRule, setAutoRule] = useState<"featured" | "bestsellers">(
    "bestsellers",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const data = (await adminFetch("/api/admin/collections", {
        method: "POST",
        body: JSON.stringify({
          name,
          mode,
          autoRule: mode === "auto" ? autoRule : null,
        }),
      })) as { collection?: AdminCollection };
      if (!data.collection) throw new Error("Create failed");
      setItems((prev) => [...prev, data.collection!]);
      setName("");
      router.push(`/admin/collections/${data.collection.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this collection?")) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/collections/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
      {/* SaaS Command Center Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Collections
            </h1>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30">
              Curation
</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Curate "Best Sellers", "Featured", and "New Arrivals" directly from here. These collections dynamically populate your storefront sections, completely avoiding hardcoded categories.
          </p>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creator Panel */}
        <div className="lg:col-span-1 h-fit bg-card border rounded-2xl p-6 shadow-sm sticky top-6">
          <h2 className="font-semibold text-lg mb-4 text-foreground">Launch New Collection</h2>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Collection Name</label>
              <Input
                placeholder="e.g. Best Deals"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted/50 border-border/50 focus-visible:ring-primary/20"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Curation Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={mode === "manual" ? "default" : "outline"}
                  onClick={() => setMode("manual")}
                  className="w-full text-xs font-medium"
                >
                  Manual Picks
                </Button>
                <Button
                  type="button"
                  variant={mode === "auto" ? "default" : "outline"}
                  onClick={() => setMode("auto")}
                  className="w-full text-xs font-medium"
                >
                  Auto Rule
                </Button>
              </div>
            </div>

            {mode === "auto" ? (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <label className="text-sm font-medium text-foreground">Algorithm</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={autoRule === "bestsellers" ? "default" : "outline"}
                    onClick={() => setAutoRule("bestsellers")}
                    className="w-full text-xs"
                    size="sm"
                  >
                    Bestsellers
                  </Button>
                  <Button
                    type="button"
                    variant={autoRule === "featured" ? "default" : "outline"}
                    onClick={() => setAutoRule("featured")}
                    className="w-full text-xs"
                    size="sm"
                  >
                    Featured Flag
                  </Button>
                </div>
              </div>
            ) : null}
            
            <Button 
              type="button" 
              className="w-full font-semibold shadow-sm mt-4" 
              disabled={busy || !name.trim()} 
              onClick={create}
            >
              {busy ? "Creating..." : "Build Collection"}
            </Button>
          </div>
        </div>

        {/* Collections List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground px-1">
            Active Curation ({items.length})
          </h2>
          
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed bg-muted/20">
              <p className="text-sm text-muted-foreground">
                No collections have been created yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {items.map((c) => (
                <div
                  key={c.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/50"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/collections/${c.id}`}
                        className="font-bold text-base hover:text-primary transition-colors block truncate"
                      >
                        {c.name}
                      </Link>
                      {!c.active && (
                        <span className="inline-block rounded-full bg-muted/60 text-muted-foreground border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shrink-0">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span className="bg-muted px-2 py-1 rounded-md text-foreground/80 font-mono text-[10px] uppercase tracking-wider">
                        /{c.slug}
                      </span>
                      
                      <span className="flex items-center px-1.5 opacity-60">|</span>
                      
                      {c.mode === "manual" ? (
                         <span className="flex items-center text-primary/80 bg-primary/5 px-2 py-1 rounded-md">
                           Manual ({c.productIds.length} items)
                         </span>
                      ) : (
                         <span className="flex items-center text-amber-600/80 dark:text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded-md">
                           Automated: {c.autoRule}
                         </span>
                      )}
                      
                      {c.homeSlot && (
                        <>
                          <span className="flex items-center px-1.5 opacity-60">|</span>
                          <span className="flex items-center px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                            Home Slot {c.homeSlot}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive border-border/50"
                    disabled={busy}
                    onClick={() => remove(c.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
