"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { adminFetch, AdminRequestError } from "@/components/admin/admin-fetch";
import { confirmedCollection } from "@/lib/collection-input";
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
}: {
  collections: CollectionPickerItem[];
  selectedIds: string[];
  onChange: (ids: string[], collections?: CollectionPickerItem[]) => void;
  productId?: string;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [uncertain, setUncertain] = useState(false);
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
    if (!trimmed || lock.current) return;
    lock.current = true;
    let unknownOutcome = false;
    setBusy(true);
    setError(null);
    try {
      const data = (await adminFetch("/api/admin/collections", {
        method: "POST",
        body: JSON.stringify({
          name: trimmed,
          mode: "manual",
          homeSlot: null,
          // Create the container only. Membership is pending product draft intent
          // and must not become live before the product is published.
          productIds: [],
        }),
      })) as { collection?: CollectionPickerItem };
      if (!confirmedCollection(data?.collection)) throw new AdminRequestError("Create outcome could not be confirmed. Reload before trying again.", 502, true);
      if (!data.collection) return;
      setName("");
      onChange(
        [...selectedIds, data.collection.id],
        [...collections, data.collection],
      );
    } catch (e) {
      if (e instanceof AdminRequestError && e.outcomeUncertain) { unknownOutcome = true; setUncertain(true); }
      setError(e instanceof Error ? e.message : "Could not create collection.");
    } finally {
      setBusy(false);
      if (!unknownOutcome) lock.current = false;
    }
  }

  return (
    <fieldset disabled={busy || uncertain} className="space-y-3 rounded-md border border-input bg-background p-3">
      <legend className="px-1 text-sm font-medium">Collections</legend>
      <p className="text-xs text-muted-foreground">
        Choose manual collections for this product. Membership changes become live
        when you publish. Configure homepage placement in Manage all collections.
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
                          <Link
                            href={`/admin/collections/${c.id}`}
                            className="underline"
                          >
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
        <p className="text-xs text-muted-foreground">
          No collections yet — create one below.
        </p>
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
      {uncertain ? <p className="text-xs text-destructive">Reload this product before creating another collection.</p> : null}
      <p className="text-xs text-muted-foreground">
        <Link href="/admin/collections" className="underline">
          Manage all collections
        </Link>
      </p>
    </fieldset>
  );
}
