"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Search } from "lucide-react";

import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ShopType } from "@/lib/categories";
import type {
  HomepageSection,
  HomepageSectionLayout,
  HomepageSectionSource,
} from "@/lib/types";

interface SimpleProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
}

export function HomepageSectionForm({
  section,
  shopTypes = [],
  availableProducts = [],
}: {
  section?: HomepageSection | null;
  shopTypes?: ShopType[];
  availableProducts?: SimpleProduct[];
}) {
  const router = useRouter();
  const isEditing = Boolean(section?.id);

  const [title, setTitle] = useState(section?.title ?? "");
  const [subtitle, setSubtitle] = useState(section?.subtitle ?? "");
  const [slug, setSlug] = useState(section?.slug ?? "");
  const [sourceType, setSourceType] = useState<HomepageSectionSource>(
    section?.sourceType ?? "manual",
  );
  const [categoryId, setCategoryId] = useState(
    section?.categoryId ?? shopTypes[0]?.slug ?? "",
  );
  const [productLimit, setProductLimit] = useState(section?.productLimit ?? 8);
  const [layout, setLayout] = useState<HomepageSectionLayout>(
    section?.layout ?? "grid",
  );
  const [showViewAll, setShowViewAll] = useState(section?.showViewAll ?? true);
  const [viewAllHref, setViewAllHref] = useState(section?.viewAllHref ?? "");
  const [isActive, setIsActive] = useState(section?.isActive ?? true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    section?.manualProductIds ?? [],
  );

  // Search filter for manual product selector
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map of id -> product for quick lookup
  const productMap = new Map(availableProducts.map((p) => [p.id, p]));

  const filteredProducts = availableProducts.filter((p) => {
    if (selectedProductIds.includes(p.id)) return false; // hide already selected
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q)
    );
  });

  function addProduct(id: string) {
    if (!selectedProductIds.includes(id)) {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  }

  function removeProduct(id: string) {
    setSelectedProductIds(selectedProductIds.filter((pid) => pid !== id));
  }

  function moveProduct(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= selectedProductIds.length) return;
    const next = [...selectedProductIds];
    [next[index], next[target]] = [next[target], next[index]];
    setSelectedProductIds(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      title,
      subtitle,
      slug,
      sourceType,
      categoryId: sourceType === "category" ? categoryId : undefined,
      productLimit: Number(productLimit),
      layout,
      showViewAll,
      viewAllHref: viewAllHref.trim() || undefined,
      isActive,
      manualProductIds:
        sourceType === "manual" ? selectedProductIds : undefined,
    };

    try {
      const url = isEditing
        ? `/api/admin/homepage-sections/${section!.id}`
        : "/api/admin/homepage-sections";
      const method = isEditing ? "PATCH" : "POST";

      await adminFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      router.push("/admin/homepage-sections");
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Edit Homepage Section" : "Create Homepage Section"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure section title, layout, product sources, and manual product
            curation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create Section"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="grid gap-6 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold border-b pb-3">
          1. Section Details
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title *</Label>
            <Input
              required
              placeholder="e.g. Featured Products, Smart Watches"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Subtitle (Optional)</Label>
            <Textarea
              placeholder="e.g. Our most popular gear and accessories"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>URL Slug (Optional)</Label>
            <Input
              placeholder="auto-generated-from-title"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Layout Type</Label>
            <select
              value={layout}
              onChange={(e) =>
                setLayout(e.target.value as HomepageSectionLayout)
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="grid">Product Grid (4 Columns)</option>
              <option value="carousel">Horizontal Product Carousel</option>
            </select>
          </div>

          <div className="flex items-center gap-3 sm:col-span-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              Section is Active (Visible on homepage)
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-6 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold border-b pb-3">
          2. Product Source
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Source Type</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => setSourceType("manual")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  sourceType === "manual"
                    ? "border-primary bg-primary/5 font-semibold text-primary"
                    : "hover:bg-accent"
                }`}
              >
                <div className="text-sm">Manual Products</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Hand-picked list
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("category")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  sourceType === "category"
                    ? "border-primary bg-primary/5 font-semibold text-primary"
                    : "hover:bg-accent"
                }`}
              >
                <div className="text-sm">Category</div>
                <div className="text-xs text-muted-foreground mt-1">
                  From a shop type
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("newest")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  sourceType === "newest"
                    ? "border-primary bg-primary/5 font-semibold text-primary"
                    : "hover:bg-accent"
                }`}
              >
                <div className="text-sm">Newest</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Latest published
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("sale")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  sourceType === "sale"
                    ? "border-primary bg-primary/5 font-semibold text-primary"
                    : "hover:bg-accent"
                }`}
              >
                <div className="text-sm">Sale Items</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Discounted items
                </div>
              </button>
            </div>
          </div>

          {sourceType === "category" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Select Category *</Label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {shopTypes.map((st) => (
                  <option key={st.id} value={st.slug}>
                    {st.name} ({st.slug})
                  </option>
                ))}
              </select>
            </div>
          )}

          {sourceType !== "manual" && (
            <div className="space-y-1.5">
              <Label>Maximum Products to Display</Label>
              <Input
                type="number"
                min={1}
                max={40}
                value={productLimit}
                onChange={(e) => setProductLimit(Number(e.target.value))}
              />
            </div>
          )}
        </div>
      </div>

      {sourceType === "manual" && (
        <div className="grid gap-6 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold border-b pb-3 flex items-center justify-between">
            <span>3. Manual Product Selection</span>
            <Badge variant="secondary">
              {selectedProductIds.length} Selected
            </Badge>
          </h2>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Selected Products List */}
            <div className="space-y-3">
              <Label>Curated Product Sequence (Order matches homepage)</Label>
              {selectedProductIds.length === 0 ? (
                <p className="text-xs text-muted-foreground border border-dashed rounded-lg p-6 text-center">
                  No products selected yet. Search and add products from the
                  list on the right.
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {selectedProductIds.map((id, index) => {
                    const p = productMap.get(id);
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-background text-sm"
                      >
                        <span className="font-semibold text-xs text-muted-foreground w-6">
                          #{index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">
                            {p?.name || id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p?.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={index === 0}
                            onClick={() => moveProduct(index, -1)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={index === selectedProductIds.length - 1}
                            onClick={() => moveProduct(index, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProduct(id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Available Products Picker */}
            <div className="space-y-3 border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
              <Label>Search & Add Catalog Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 border rounded-lg p-2">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 text-center">
                    No matching products available to add.
                  </p>
                ) : (
                  filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.category}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addProduct(p.id)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold border-b pb-3">
          4. View All Link (Optional)
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input
                type="checkbox"
                checked={showViewAll}
                onChange={(e) => setShowViewAll(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary"
              />
              Show &quot;View All&quot; button in section header
            </label>
          </div>

          {showViewAll && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Custom View All URL (Optional)</Label>
              <Input
                placeholder="e.g. /products/smartwatches or /products"
                value={viewAllHref}
                onChange={(e) => setViewAllHref(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to automatically point to the section category or
                shop page.
              </p>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
