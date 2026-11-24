"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AdminStickyPublishBar } from "@/components/admin/admin-sticky-publish-bar";
import { useAdminFormDirty } from "@/components/admin/use-admin-form-dirty";
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
  const [seoTitle, setSeoTitle] = useState(shopType?.seoTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(shopType?.metaDescription ?? "");
  const [seoH1, setSeoH1] = useState(shopType?.seoH1 ?? "");
  const [seoIntro, setSeoIntro] = useState(shopType?.seoIntro ?? "");
  const [guideText, setGuideText] = useState(shopType?.guideText ?? "");
  const [faq, setFaq] = useState<{ question: string; answer: string }[]>(shopType?.faq ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formSnapshot = useMemo(
    () => ({
      name,
      description,
      imageUrl,
      sortOrder,
      active,
      seoTitle,
      metaDescription,
      seoH1,
      seoIntro,
      guideText,
      faq,
    }),
    [name, description, imageUrl, sortOrder, active, seoTitle, metaDescription, seoH1, seoIntro, guideText, faq],
  );
  const { dirty, syncSaved } = useAdminFormDirty(
    formSnapshot,
    !isNew,
  );

  async function save() {
    setSaving(true);
    setError(null);
    const doc = {
      name,
      description,
      imageUrl: imageUrl || undefined,
      sortOrder: sortOrder === "" ? undefined : Number(sortOrder),
      active,
      seoTitle,
      metaDescription,
      seoH1,
      seoIntro,
      guideText,
      faq,
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
      syncSaved();
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

      {!isNew ? (
        <AdminStickyPublishBar>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Status:{" "}
              <span className="font-medium text-foreground">
                {dirty ? "Unsaved changes" : "Up to date"}
              </span>
            </p>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save category"}
            </Button>
          </div>
        </AdminStickyPublishBar>
      ) : null}

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
            hint="Format: JPG, WEBP, or PNG. Recommended size: 1080x1080px (Square). Sharpest on mobile and desktop without distortion."
            urls={imageUrl ? [imageUrl] : []}
            onChange={(urls) => setImageUrl(urls[urls.length - 1] ?? "")}
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

        <div className="space-y-6 bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Search and page content</h2>
            <p className="text-xs text-muted-foreground">
              All optional. Leave a field empty to use the default; empty fields are not shown on the storefront.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seo-title" className="text-foreground font-semibold">SEO title</Label>
            <Input id="seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="bg-muted/50 border-border/50" />
            <p className="text-xs text-muted-foreground">{seoTitle.length} / 60 characters recommended</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seo-meta" className="text-foreground font-semibold">Meta description</Label>
            <Textarea id="seo-meta" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="resize-none h-20 bg-muted/50 border-border/50" />
            <p className="text-xs text-muted-foreground">{metaDescription.length} / 160 characters recommended</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seo-h1" className="text-foreground font-semibold">H1 heading</Label>
            <Input id="seo-h1" value={seoH1} onChange={(e) => setSeoH1(e.target.value)} className="bg-muted/50 border-border/50" placeholder="Defaults to the category name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seo-intro" className="text-foreground font-semibold">Intro (above products, about two lines)</Label>
            <Textarea id="seo-intro" value={seoIntro} onChange={(e) => setSeoIntro(e.target.value)} className="resize-none h-20 bg-muted/50 border-border/50" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seo-guide" className="text-foreground font-semibold">Guide text (below products)</Label>
            <Textarea id="seo-guide" value={guideText} onChange={(e) => setGuideText(e.target.value)} className="h-40 bg-muted/50 border-border/50" />
            <p className="text-xs text-muted-foreground">Separate paragraphs with a blank line.</p>
          </div>
          <div className="space-y-3">
            <Label className="text-foreground font-semibold">FAQ (below products)</Label>
            {faq.map((item, i) => (
              <div key={i} className="space-y-2 rounded-xl border p-3">
                <Input
                  aria-label={`FAQ question ${i + 1}`}
                  placeholder="Question"
                  value={item.question}
                  onChange={(e) => setFaq((rows) => rows.map((r, j) => (j === i ? { ...r, question: e.target.value } : r)))}
                  className="bg-muted/50 border-border/50"
                />
                <Textarea
                  aria-label={`FAQ answer ${i + 1}`}
                  placeholder="Answer"
                  value={item.answer}
                  onChange={(e) => setFaq((rows) => rows.map((r, j) => (j === i ? { ...r, answer: e.target.value } : r)))}
                  className="resize-none h-20 bg-muted/50 border-border/50"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setFaq((rows) => rows.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setFaq((rows) => [...rows, { question: "", answer: "" }])}>
              Add question
            </Button>
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
