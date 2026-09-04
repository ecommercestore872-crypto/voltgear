"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";

import { StringArrayInput } from "@/components/admin/string-array-input";
import { ObjectArrayInput } from "@/components/admin/object-array-input";

import { MediaField } from "@/components/admin/media-field";
import { PublishBar } from "@/components/admin/publish-bar";
import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ShopType } from "@/lib/categories";
import { PRODUCT_PHOTO_HINT } from "@/lib/product-image";
import type { AdminProduct } from "@/lib/db/admin-types";
import { ProductCollectionsFields } from "@/components/admin/product-collections-fields";
import { VariantAxesFields } from "@/components/admin/variant-axes-fields";
import type { CollectionPickerItem } from "@/lib/db/collection-rules";
import {
  portableTextToPlain,
  slugify,
  textToPortableText,
  type ProductDocument,
  type PublishStatus,
} from "@/lib/db/publish";

function emptyDoc(): ProductDocument {
  return {
    name: "",
    slug: "",
    category: "",
    price: 0,
    stockStatus: "in-stock",
    quantity: null,
    images: [],
    features: [],
    specifications: [],
    compatibility: [],
    inTheBox: [],
    productFaq: [],
    variants: [],
    colorEnabled: false,
    sizeEnabled: false,
    colorOptions: [],
    sizeOptions: [],
    reviews: [],
  };
}

function fromProduct(product?: AdminProduct | null, knownSlugs: string[] = []): ProductDocument {
  if (!product) return emptyDoc();
  const doc = product.draft ?? {
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    sku: product.sku,
    category: product.category,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    images: product.images ?? [],
    cloudinaryImages: product.cloudinaryImages,
    shortDescription: product.shortDescription,
    description: product.description,
    features: product.features,
    specifications: product.specifications,
    compatibility: product.compatibility,
    inTheBox: product.inTheBox,
    productVideo: product.productVideo,
    variants: product.variants,
    colorEnabled: product.colorEnabled,
    sizeEnabled: product.sizeEnabled,
    colorOptions: product.colorOptions,
    sizeOptions: product.sizeOptions,
    productFaq: product.productFaq,
    stockStatus: product.stockStatus,
    quantity: product.quantity ?? null,
    rating: product.rating,
    reviewCount: product.reviewCount,
    reviews: product.reviews,
    featured: product.featured,
    badge: product.badge,
    isDemo: product.isDemo,
    costPrice: product.costPrice,
  };
  const merged = {
    ...emptyDoc(),
    ...doc,
    isDemo: Boolean(doc.isDemo ?? product.isDemo),
    costPrice: doc.costPrice ?? product.costPrice,
  };
  if (merged.category && !knownSlugs.includes(merged.category)) {
    merged.category = "";
  }
  return merged;
}

export function ProductForm({
  product,
  shopTypes,
  collections = [],
  collectionIds = [],
}: {
  product?: AdminProduct | null;
  shopTypes: ShopType[];
  collections?: CollectionPickerItem[];
  collectionIds?: string[];
}) {
  const router = useRouter();
  const isNew = !product;
  const knownSlugs = shopTypes.map((t) => t.slug);
  const [doc, setDoc] = useState<ProductDocument>(() => fromProduct(product, knownSlugs));
  const [status, setStatus] = useState<PublishStatus>(product?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState(() =>
    portableTextToPlain(fromProduct(product, knownSlugs).description)
  );
  const [collectionList, setCollectionList] = useState(collections);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState(collectionIds);
  const id = product?._id;

  const set = <K extends keyof ProductDocument>(key: K, value: ProductDocument[K]) => {
    setDoc((d) => ({ ...d, [key]: value }));
  };

  const payload = useMemo(() => {
    const slug = isNew ? slugify(doc.name) : doc.slug;
    return { ...doc, slug, description: textToPortableText(description) };
  }, [doc, description, isNew]);

  async function run(action: "create" | "save" | "publish" | "unpublish" | "discard" | "delete") {
    setSaving(true);
    setError(null);
    try {
      if (action === "create" || action === "save" || action === "publish") {
        if (!shopTypes.some((t) => t.slug === payload.category)) {
          setError("Pick a category.");
          return;
        }
      }
      if (action === "create") {
        const json = await adminFetch("/api/admin/products", {
          method: "POST",
          body: JSON.stringify({ doc: payload, collectionIds: selectedCollectionIds }),
        });
        router.replace(`/admin/products/${json.id}`);
        return;
      }
      if (!id) return;
      if (action === "delete") {
        if (!confirm("Delete this product? This cannot be undone.")) return;
        await adminFetch(`/api/admin/products/${id}`, { method: "DELETE" });
        router.replace("/admin/products");
        return;
      }
      await adminFetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, doc: payload, collectionIds: selectedCollectionIds }),
      });
      if (action === "publish") setStatus("published");
      if (action === "unpublish") setStatus("unpublished");
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">{isNew ? "Add product" : doc.name || "Edit product"}</h1>
        {!isNew ? (
          <Button type="button" variant="destructive" onClick={() => run("delete")}>
            Delete
          </Button>
        ) : null}
      </div>

      {isNew ? (
        <Button type="button" onClick={() => run("create")} disabled={saving}>
          Save draft
        </Button>
      ) : (
        <PublishBar
          status={status}
          saving={saving}
          onSave={() => run("save")}
          onPublish={() => run("publish")}
          onUnpublish={() => run("unpublish")}
          onDiscard={() => run("discard")}
        />
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Product name</Label>
            <Input id="name" value={doc.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <MediaField
            label="Photos"
            hint={PRODUCT_PHOTO_HINT}
            urls={doc.images ?? []}
            onChange={(images) => set("images", images)}
          />
          <div className="space-y-1.5">
            <Label htmlFor="tiktok-url">TikTok Video Link</Label>
            <Input
              id="tiktok-url"
              value={doc.tiktokUrl ?? ""}
              onChange={(e) => set("tiktokUrl", e.target.value)}
              placeholder="https://www.tiktok.com/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instagram-url">Instagram Reel Link</Label>
            <Input
              id="instagram-url"
              value={doc.instagramUrl ?? ""}
              onChange={(e) => set("instagramUrl", e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
            />
          </div>
          <MediaField
            label="Cover photo (optional)"
            urls={doc.productVideo?.poster ? [doc.productVideo.poster] : []}
            onChange={(urls) => set("productVideo", { ...doc.productVideo, poster: urls[0] })}
          />
          <div className="space-y-1.5">
            <Label htmlFor="short">Short summary</Label>
            <Textarea
              id="short"
              value={doc.shortDescription ?? ""}
              onChange={(e) => set("shortDescription", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="long">Full details</Label>
            <Textarea
              id="long"
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="pt-4 space-y-8 border-t">
            <h2 className="text-lg font-semibold">Additional Details</h2>
            <StringArrayInput
              label="Why you'll like it (Features)"
              values={doc.features ?? []}
              onChange={(val) => set("features", val)}
              placeholder="e.g. Always-On Retina Display"
            />
            <ObjectArrayInput
              label="Specifications"
              values={doc.specifications ?? []}
              onChange={(val) => set("specifications", val)}
            />
            <StringArrayInput
              label="What's in the Box"
              values={doc.inTheBox ?? []}
              onChange={(val) => set("inTheBox", val)}
              placeholder="e.g. USB-C Charging Cable"
            />
            <StringArrayInput
              label="Compatibility (Works With)"
              values={doc.compatibility ?? []}
              onChange={(val) => set("compatibility", val)}
              placeholder="e.g. iPhone 15 Series"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              min={0}
              value={doc.price}
              onChange={(e) => set("price", Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compare">Old price (optional)</Label>
            <Input
              id="compare"
              type="number"
              min={0}
              value={doc.compareAtPrice ?? ""}
              onChange={(e) =>
                set("compareAtPrice", e.target.value === "" ? undefined : Number(e.target.value))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cost">Your cost (hidden from shop)</Label>
            <Input
              id="cost"
              type="number"
              min={0}
              value={doc.costPrice ?? ""}
              onChange={(e) =>
                set("costPrice", e.target.value === "" ? undefined : Number(e.target.value))
              }
            />
            <p className="text-xs text-muted-foreground">Used only for delivered profit in Analytics.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            {shopTypes.length ? (
              <select
                id="category"
                required
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={doc.category}
                onChange={(e) => set("category", e.target.value)}
              >
                <option value="">Pick a category</option>
                {shopTypes.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link href="/admin/categories/new" className="underline">
                  Add a shop type first
                </Link>
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock">Availability</Label>
            <select
              id="stock"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={doc.stockStatus}
              onChange={(e) => set("stockStatus", e.target.value)}
            >
              <option value="in-stock">In stock</option>
              <option value="low-stock">Low stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quantity">Units on hand</Label>
            <Input
              id="quantity"
              type="number"
              min={0}
              step={1}
              value={doc.quantity ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  set("quantity", null);
                  return;
                }
                const n = Number(raw);
                set("quantity", Number.isInteger(n) && n >= 0 ? n : doc.quantity ?? null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for unlimited. Set a number to stop overselling. Zero marks the product sold out.
            </p>
          </div>
          <VariantAxesFields
            colorEnabled={Boolean(doc.colorEnabled)}
            sizeEnabled={Boolean(doc.sizeEnabled)}
            colorOptions={doc.colorOptions ?? []}
            sizeOptions={doc.sizeOptions ?? []}
            onChange={(next) =>
              setDoc((d) => ({
                ...d,
                colorEnabled: next.colorEnabled,
                sizeEnabled: next.sizeEnabled,
                colorOptions: next.colorOptions,
                sizeOptions: next.sizeOptions,
              }))
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(doc.featured)}
              onChange={(e) => set("featured", e.target.checked)}
            />
            Featured — homepage spotlight
          </label>
          <ProductCollectionsFields
            collections={collectionList}
            selectedIds={selectedCollectionIds}
            productId={id}
            onChange={(ids, nextCollections) => {
              setSelectedCollectionIds(ids);
              if (nextCollections) setCollectionList(nextCollections);
            }}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(doc.isDemo)}
              onChange={(e) => set("isDemo", e.target.checked)}
            />
            Practice product — guests cannot see this
          </label>
        </div>
      </div>
    </div>
  );
}
