"use client";

import Link from "next/link";
import { useState } from "react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  canAssignProductToCollection,
  collectionPickerHint,
  type CollectionPickerItem,
} from "@/lib/db/collection-rules";

export function ProductCollectionsFields({
  collections,
  selectedIds,
  onChange,
  productId,
}: {
  collections: CollectionPickerItem[];
  selectedIds: string[];
  onChange: (ids: string[], collections?: CollectionPickerItem[]) => void;
  productId?: string;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = new Set(selectedIds);

  function toggle(id: string, assignable: boolean) {
    if (!assignable) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  }

  async function createCollection() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = (await adminFetch("/api/admin/collections", {
        method: "POST",
        body: JSON.stringify({
          name: trimmed,
          mode: "manual",
          productIds: productId ? [productId] : [],
        }),
      })) as { collection?: CollectionPickerItem };
      if (!data.collection) throw new Error("Could not create collection.");
      setName("");
      onChange([...selectedIds, data.collection.id], [...collections, data.collection]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create collection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="space-y-3 rounded-md border border-input bg-background p-3">
      <legend className="px-1 text-sm font-medium">Collections</legend>
      <p className="text-xs text-muted-foreground">
        Put this product on Featured, Best Sellers, or any collection. New collections
        use the same home product rail as Best Sellers.
      </p>
      {collections.length ? (
        <ul className="space-y-2">
          {collections.map((c) => {
            const assignable = canAssignProductToCollection(c.mode);
            return (
              <li key={c.id}>
                <label
                  className={`flex items-start gap-2 text-sm ${assignable ? "cursor-pointer" : "opacity-70"}`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={assignable ? selected.has(c.id) : false}
                    disabled={!assignable}
                    onChange={() => toggle(c.id, assignable)}
                  />
                  <span>
                    <span className="font-medium">{c.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {collectionPickerHint(c)}
                      {!assignable ? (
                        <>
                          {" · "}
                          <Link href={`/admin/collections/${c.id}`} className="underline">
                            Switch to manual picks
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No collections yet — create one below.</p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="new-collection">New collection</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="new-collection"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Best Sellers, Summer picks"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void createCollection();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy || !name.trim()}
            onClick={() => void createCollection()}
          >
            Create
          </Button>
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">
        <Link href="/admin/collections" className="underline">
          Manage all collections
        </Link>
      </p>
    </fieldset>
  );
}
