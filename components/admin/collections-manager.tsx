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
    "bestsellers"
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Collections</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Best Sellers, Featured, and Best Offers are created here so they are not
        hardcoded on the home page. Edit or add more collections anytime.
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-medium">New collection</h2>
        <Input
          placeholder="Name (e.g. Bestsellers)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Collection name"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "manual" ? "default" : "outline"}
            onClick={() => setMode("manual")}
          >
            Manual picks
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "auto" ? "default" : "outline"}
            onClick={() => setMode("auto")}
          >
            Auto rule
          </Button>
        </div>
        {mode === "auto" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={autoRule === "bestsellers" ? "default" : "outline"}
              onClick={() => setAutoRule("bestsellers")}
            >
              Bestsellers
            </Button>
            <Button
              type="button"
              size="sm"
              variant={autoRule === "featured" ? "default" : "outline"}
              onClick={() => setAutoRule("featured")}
            >
              Featured flag
            </Button>
          </div>
        ) : null}
        <Button type="button" disabled={busy || !name.trim()} onClick={create}>
          Create
        </Button>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Created collections</h2>
      <ul className="space-y-2">
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground">No collections yet.</li>
        ) : (
          items.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-3"
            >
              <div>
                <Link
                  href={`/admin/collections/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {c.slug} · {c.mode}
                  {c.autoRule ? ` · ${c.autoRule}` : ""} ·{" "}
                  {c.mode === "manual"
                    ? `${c.productIds.length} products`
                    : "auto"}
                  {c.homeSlot ? ` · on home` : ""}
                  {!c.active ? " · inactive" : ""}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => remove(c.id)}
              >
                Delete
              </Button>
            </li>
          ))
        )}
      </ul>
      </div>
    </div>
  );
}
