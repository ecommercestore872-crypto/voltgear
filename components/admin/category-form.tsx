"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MediaField } from "@/components/admin/media-field";
import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ShopType } from "@/lib/categories";

export function CategoryForm({ shopType }: { shopType?: ShopType | null }) {
  const router = useRouter();
  const isNew = !shopType;
  const [name, setName] = useState(shopType?.name ?? "");
  const [description, setDescription] = useState(shopType?.description ?? "");
  const [imageUrl, setImageUrl] = useState(shopType?.imageUrl ?? "");
  const [sortOrder, setSortOrder] = useState(
    shopType?.sortOrder != null ? String(shopType.sortOrder) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const doc = {
      name,
      description,
      imageUrl: imageUrl || undefined,
      sortOrder: sortOrder === "" ? undefined : Number(sortOrder),
    };
    try {
      if (isNew) {
        const json = await adminFetch("/api/admin/categories", {
          method: "POST",
          body: JSON.stringify({ doc }),
        });
        router.replace(`/admin/categories/${json.id}`);
        return;
      }
      if (!shopType?.id) return;
      await adminFetch(`/api/admin/categories/${shopType.id}`, {
        method: "PATCH",
        body: JSON.stringify({ doc }),
      });
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!shopType?.id) return;
    if (!confirm("Delete this shop type?")) return;
    setSaving(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/categories/${shopType.id}`, {
        method: "DELETE",
      });
      router.replace("/admin/categories");
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          {isNew ? "Add shop type" : name || "Edit shop type"}
        </h1>
        {!isNew ? (
          <Button
            type="button"
            variant="destructive"
            onClick={remove}
            disabled={saving}
          >
            Delete
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="type-name">Shop type name</Label>
          <Input
            id="type-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type-desc">Short description</Label>
          <Textarea
            id="type-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <MediaField
          label="Photo (optional)"
          urls={imageUrl ? [imageUrl] : []}
          onChange={(urls) => setImageUrl(urls[0] ?? "")}
        />
        <div className="space-y-1.5">
          <Label htmlFor="type-sort">Sort number</Label>
          <Input
            id="type-sort"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="Leave blank to add at the end"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/categories">Back to shop types</Link>
        </Button>
      </div>
    </div>
  );
}
