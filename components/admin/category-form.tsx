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
  const [active, setActive] = useState(shopType?.active ?? true);
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
      active,
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
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto pb-10">
      <div className="space-y-4">
        <Link
          href="/admin/categories"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
        >
          &larr; Back to Categories
        </Link>

        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {isNew ? "Add New Category" : name || "Edit Category"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isNew 
                ? "Create a new product structure container. Group related items and build intuitive navigation for your customers."
                : "Modify this category’s metadata, descriptions, branding image, or storefront visibility state."}
            </p>
          </div>

          {!isNew ? (
            <Button
              type="button"
              variant="destructive"
              onClick={remove}
              disabled={saving}
              className="shrink-0 shadow-sm"
            >
              Delete Category
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-8 mt-6">
        {error ? (
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        ) : null}

        <div className="space-y-6 bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="type-name" className="text-foreground font-semibold">Category Name</Label>
            <Input
              id="type-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-muted/50 border-border/50 focus-visible:ring-primary/20"
              placeholder="e.g. Smartwatches"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type-desc" className="text-foreground font-semibold">Short Description</Label>
            <Textarea
              id="type-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none h-24 bg-muted/50 border-border/50 focus-visible:ring-primary/20"
              placeholder="A brief overview of what this category contains..."
            />
          </div>

          <MediaField
            label="Cover Photo (optional)"
            hint="Recommended size: 1080x1080px (Square). Sharpest on mobile and desktop."
            urls={imageUrl ? [imageUrl] : []}
            onChange={(urls) => setImageUrl(urls[0] ?? "")}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label htmlFor="type-sort" className="text-foreground font-semibold">Sort Position</Label>
              <Input
                id="type-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="Leave blank to push to end"
                className="bg-muted/50 border-border/50 focus-visible:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">Controls navigational hierarchy (0 is first)</p>
            </div>
            
            <div className="space-y-1.5 pt-1">
              <Label className="text-foreground font-semibold block mb-3">Visibility</Label>
              <label className="flex items-center gap-3 text-sm p-3 border rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Active on storefront</span>
                  <span className="text-xs text-muted-foreground">Allows customers to view this category</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button 
          type="button" 
          onClick={save} 
          disabled={saving}
          className="w-full sm:w-auto px-8"
        >
          {saving ? "Saving Changes…" : "Save Category"}
        </Button>
      </div>
    </div>
  );
}
