"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { StringArrayInput } from "@/components/admin/string-array-input";
import { ObjectArrayInput } from "@/components/admin/object-array-input";

const MediaField = dynamic(
  () => import("@/components/admin/media-field").then((m) => m.MediaField),
  { ssr: false },
);
import { PublishBar } from "@/components/admin/publish-bar";
import { adminFetch, AdminAuthError, AdminRequestError } from "@/components/admin/admin-fetch";
import { AdminStickyPublishBar } from "@/components/admin/admin-sticky-publish-bar";
import { useAdminFormDirty } from "@/components/admin/use-admin-form-dirty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ShopType } from "@/lib/categories";
import { PRODUCT_PHOTO_HINT } from "@/lib/product-image";
import type { AdminProduct } from "@/lib/db/admin-types";
import { ProductCollectionsFields } from "@/components/admin/product-collections-fields";
const VariantAxesFields = dynamic(
  () =>
    import("@/components/admin/variant-axes-fields").then((m) => m.VariantAxesFields),
  { ssr: false },
);
import type { CollectionPickerItem } from "@/lib/db/collection-rules";
import {
  buildProductActionRequest,
  type ProductAction,
} from "@/lib/admin-product-action-rules";
import { productDocumentFromAdmin } from "@/lib/admin-product-form-rules";
import { isProductRevision, productNumberText, validateProductInput, type InventoryIntent } from "@/lib/admin-product-input";
import {
  portableTextToPlain,
  slugify,
  textToPortableText,
  type ProductDocument,
  type PublishStatus,
} from "@/lib/db/publish";

function numericText(document: ProductDocument) {
  return {
    price: String(document.price),
    compare: document.compareAtPrice == null ? "" : String(document.compareAtPrice),
    cost: document.costPrice == null ? "" : String(document.costPrice),
    quantity: document.quantity == null ? "" : String(document.quantity),
    addons: (document.addons ?? []).map((addon) => String(addon.price)),
  };
}

function confirmedMutation(value: unknown, id?: string): value is {
  ok: true; id: string; adminRevision: string; inventoryRevision: string; membershipRevision: string; manualCollectionIds: string[];
  quantity: number | null; stockStatus: "in-stock" | "low-stock" | "out-of-stock";
} {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return result.ok === true && typeof result.id === "string" && result.id.length > 0 && (!id || result.id === id)
    && isProductRevision(result.adminRevision) && isProductRevision(result.inventoryRevision)
    && isProductRevision(result.membershipRevision) && Array.isArray(result.manualCollectionIds)
    && result.manualCollectionIds.every((value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) && new Set(result.manualCollectionIds).size === result.manualCollectionIds.length
    && (result.quantity === null || (typeof result.quantity === "number" && Number.isInteger(result.quantity) && result.quantity >= 0 && result.quantity <= 2147483647))
    && ["in-stock", "low-stock", "out-of-stock"].includes(result.stockStatus as string);
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
  const [doc, setDoc] = useState<ProductDocument>(() =>
    productDocumentFromAdmin(product, knownSlugs),
  );
  const [numbers, setNumbers] = useState(() => numericText(productDocumentFromAdmin(product, knownSlugs)));
  const numbersRef = useRef(numbers);
  numbersRef.current = numbers;
  const adminRevisionRef = useRef(product?.adminRevision);
  const liveInventoryRef = useRef({
    revision: product ? product.inventoryRevision : "0",
    quantity: product?.quantity ?? null,
    stockStatus: product?.stockStatus ?? "in-stock",
  });
  const [uncertain, setUncertain] = useState(false);
  const uncertainRef = useRef(false);
  const [status, setStatus] = useState<PublishStatus>(
    product?.status ?? "draft",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState(() =>
    portableTextToPlain(
      productDocumentFromAdmin(product, knownSlugs).description,
    ),
  );
  const [collectionList, setCollectionList] = useState(collections);
  const [selectedCollectionIds, setSelectedCollectionIds] =
    useState(() => product?.draft?.collectionIntent?.mode !== "preserve" && Array.isArray(product?.draft?._collectionIds) ? [...product.draft._collectionIds] : [...(product?.manualCollectionIds ?? collectionIds)]);
  const [activeUploads, setActiveUploads] = useState(0);
  const activeUploadsRef = useRef(0);
  const savingRef = useRef(false);
  const collectionIdsRef = useRef(selectedCollectionIds);
  collectionIdsRef.current = selectedCollectionIds;
  const savedCollectionIdsRef = useRef([...(product?.manualCollectionIds ?? collectionIds)]);
  const membershipRevisionRef = useRef(product ? product.membershipRevision : "0");
  const liveDocumentRef = useRef(product ? productDocumentFromAdmin({ ...product, draft: null }, knownSlugs) : null);
  const id = product?._id;

  const set = <K extends keyof ProductDocument>(
    key: K,
    value: ProductDocument[K],
  ) => {
    setDoc((d) => ({ ...d, [key]: value }));
  };

  const payload = useMemo(() => {
    const slug = isNew ? slugify(doc.name) : doc.slug;
    return { ...doc, slug, description: textToPortableText(description) };
  }, [doc, description, isNew]);

  // Keep a mutable ref of the latest payload to prevent 
  // stale closures when 'onBlur' auto-commits immediately trigger 'Save'.
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const dirtyState = useMemo(
    () => ({
      payload,
      numbers,
      collectionIds: [...selectedCollectionIds].sort(),
    }),
    [payload, numbers, selectedCollectionIds],
  );
  const { dirty, resetSaved } = useAdminFormDirty(dirtyState, true, activeUploads > 0 || saving);

  function commitSavedBaseline(latest: ProductDocument, submittedCollections: string[], latestNumbers = numericText(latest)) {
    resetSaved({
      payload: {
        ...latest,
        description: textToPortableText(
          portableTextToPlain(latest.description),
        ),
      },
      numbers: latestNumbers,
      collectionIds: [...submittedCollections].sort(),
    });
  }

  async function run(action: ProductAction) {
    if (savingRef.current || uncertainRef.current) return;
    if (activeUploadsRef.current > 0) {
      setError("Please wait for media uploads to finish before saving.");
      return;
    }

    // Lock synchronously, before yielding for onBlur commits, so repeated clicks
    // cannot create duplicate mutations while React is updating disabled state.
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (activeUploadsRef.current > 0) {
        setError("Please wait for media uploads to finish before saving.");
        return;
      }
      let latestPayload = payloadRef.current;
      let submittedNumbers = numbersRef.current;
      let submittedCollections = [...collectionIdsRef.current];
      const requestedCollections = latestPayload.collectionIntent?.mode === "adjust" ? submittedCollections : null;
      if (action === "publish" && latestPayload.collectionIntent === undefined && Array.isArray(latestPayload._collectionIds)) {
        setError("This older draft has collection selections without a revision. Review and use the selected collections, or keep live collections, before publishing.");
        return;
      }
      if (action === "create" || action === "save" || action === "publish") {
        const quantity = productNumberText(submittedNumbers.quantity, true, true);
        latestPayload = {
          ...latestPayload,
          price: productNumberText(submittedNumbers.price)!,
          compareAtPrice: productNumberText(submittedNumbers.compare, true),
          costPrice: productNumberText(submittedNumbers.cost, true),
          quantity,
          addons: (latestPayload.addons ?? []).map((addon, index) => ({ ...addon, price: productNumberText(submittedNumbers.addons[index] ?? "")! })),
          inventoryIntent: latestPayload.inventoryIntent?.mode === "adjust"
            ? { ...latestPayload.inventoryIntent, quantity, stockStatus: latestPayload.stockStatus as Extract<InventoryIntent, { mode: "adjust" }>["stockStatus"] }
            : { mode: "preserve" },
        };
        validateProductInput(latestPayload);
        if (action === "publish" && latestPayload.price <= 0) {
          setError("Selling price must be greater than zero before publishing.");
          return;
        }
        if (!shopTypes.some((t) => t.slug === latestPayload.category)) {
          setError("Pick a category.");
          return;
        }
      }
      if (action !== "create" && action !== "delete" && !isProductRevision(adminRevisionRef.current)) {
        setError("Editor revision is missing. Reload the product before saving.");
        return;
      }
      const request = buildProductActionRequest({
        action,
        id,
        document: latestPayload,
        collectionIds: requestedCollections,
        expectedAdminRevision: adminRevisionRef.current,
      });
      if (!request) return;
      if (action === "delete") {
        if (!confirm("Delete this product? This cannot be undone.")) return;
      }
      const json = await adminFetch(request.path, request.init);
      if (action === "delete") {
        router.replace("/admin/products");
        return;
      }
      if (!confirmedMutation(json, id)) {
        uncertainRef.current = true;
        setUncertain(true);
        setError("The product may have changed, but the response could not be confirmed. Reload the product before taking another action.");
        return;
      }
      if (action === "create") {
        router.replace(`/admin/products/${json.id}`);
        return;
      }
      adminRevisionRef.current = json.adminRevision;
      membershipRevisionRef.current = json.membershipRevision;
      savedCollectionIdsRef.current = [...json.manualCollectionIds];
      if (latestPayload.collectionIntent?.mode === "preserve" || action === "publish") {
        submittedCollections = [...json.manualCollectionIds];
        collectionIdsRef.current = submittedCollections;
        setSelectedCollectionIds(submittedCollections);
      }
      liveInventoryRef.current = { revision: json.inventoryRevision, quantity: json.quantity, stockStatus: json.stockStatus };
      if (liveDocumentRef.current) liveDocumentRef.current = { ...liveDocumentRef.current, quantity: json.quantity, stockStatus: json.stockStatus, inventoryIntent: { mode: "preserve" } };
      if (action === "publish") {
        setStatus("published");
        latestPayload = { ...latestPayload, quantity: json.quantity, stockStatus: json.stockStatus, inventoryIntent: { mode: "preserve" }, collectionIntent: { mode: "preserve" } };
        delete latestPayload._collectionIds;
        liveDocumentRef.current = latestPayload;
      }
      if (action === "unpublish") setStatus("unpublished");
      if (action === "discard" && product) {
        const live = { ...liveDocumentRef.current!, collectionIntent: { mode: "preserve" as const } };
        delete live._collectionIds;
        const restoredCollections = [...savedCollectionIdsRef.current];
        const liveDescription = portableTextToPlain(live.description);
        setDoc(live);
        setNumbers(numericText(live));
        setDescription(liveDescription);
        setSelectedCollectionIds(restoredCollections);
        collectionIdsRef.current = restoredCollections;
        commitSavedBaseline({
          ...live,
          description: textToPortableText(liveDescription),
        }, restoredCollections);
      } else if (action === "save" || action === "publish") {
        if (latestPayload.inventoryIntent?.mode !== "adjust") {
          latestPayload = { ...latestPayload, quantity: json.quantity, stockStatus: json.stockStatus };
          submittedNumbers = { ...submittedNumbers, quantity: json.quantity == null ? "" : String(json.quantity) };
        }
        setDoc(latestPayload);
        setNumbers(submittedNumbers);
        commitSavedBaseline(latestPayload, submittedCollections, submittedNumbers);
      }
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      if (err instanceof AdminRequestError && err.outcomeUncertain) {
        uncertainRef.current = true;
        setUncertain(true);
      }
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const handleBusyChange = useCallback((busy: boolean) => {
    activeUploadsRef.current = Math.max(0, activeUploadsRef.current + (busy ? 1 : -1));
    setActiveUploads(activeUploadsRef.current);
  }, []);

  function adjustInventory(stockStatus = doc.stockStatus) {
    const expectedRevision = doc.inventoryIntent?.mode === "adjust"
      ? doc.inventoryIntent.expectedRevision : isNew ? "0" : liveInventoryRef.current.revision;
    if (!isProductRevision(expectedRevision)) {
      setError("Inventory revision is missing. Reload the product before adjusting stock.");
    }
    setDoc((current) => ({ ...current, stockStatus, inventoryIntent: {
      mode: "adjust", expectedRevision: expectedRevision ?? "", quantity: current.quantity ?? null,
      stockStatus: stockStatus as "in-stock" | "low-stock" | "out-of-stock",
    } }));
  }

  function adjustCollections(ids: string[]) {
    const expectedRevision = doc.collectionIntent?.mode === "adjust" ? doc.collectionIntent.expectedRevision : membershipRevisionRef.current;
    if (!isProductRevision(expectedRevision)) { setError("Collection revision is missing. Reload before changing collections."); return; }
    setSelectedCollectionIds(ids);
    collectionIdsRef.current = ids;
    setDoc((current) => ({ ...current, _collectionIds: ids, collectionIntent: { mode: "adjust", expectedRevision } }));
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-4">
        <Link
          href="/admin/products"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
        >
          &larr; Back to Catalog
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {isNew ? "Add New Product" : doc.name || "Edit Product"}
              {!isNew && (
                <Badge variant="outline" className="font-normal text-muted-foreground hidden sm:inline-flex bg-muted/30">
                  {status === "published" ? "Published" : status === "unpublished" ? "Unpublished" : "Draft"}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isNew 
                ? "Construct a beautiful new listing for your storefront. Optimize images, set accurate pricing, and select the correct shop category."
                : "Modify this item’s metadata, variant availability, or live pricing. Changes made here will immediately reflect to your customers once published."}
            </p>
          </div>

          {!isNew ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => run("delete")}
              className="shrink-0 shadow-sm"
              disabled={saving || activeUploads > 0 || uncertain}
            >
              Delete Product
            </Button>
          ) : null}
        </div>
      </div>

      {isNew ? (
        <AdminStickyPublishBar>
          <Button type="button" onClick={() => run("create")} disabled={saving || activeUploads > 0 || uncertain}>
            Save draft {activeUploads > 0 && "(Uploading...)"}
          </Button>
        </AdminStickyPublishBar>
      ) : (
        <AdminStickyPublishBar>
          <PublishBar
            status={status}
            dirty={dirty}
            saving={saving || activeUploads > 0 || uncertain}
            onSave={() => run("save")}
            onPublish={() => run("publish")}
            onUnpublish={() => run("unpublish")}
            onDiscard={() => run("discard")}
          />
        </AdminStickyPublishBar>
      )}
      {error ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button type="button" variant="outline" onClick={() => window.location.reload()}>Reload product</Button></div> : null}

      {activeUploads > 0 ? <p role="status" className="text-sm text-muted-foreground">Uploading media. Editing and saving are paused until the upload finishes.</p> : null}
      <fieldset disabled={saving || activeUploads > 0 || uncertain} aria-busy={saving || activeUploads > 0} className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Product name</Label>
            <Input
              id="name"
              value={doc.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <MediaField
            label="Photos"
            hint={PRODUCT_PHOTO_HINT}
            urls={doc.images ?? []}
            onChange={(images) => set("images", images)}
            onBusyChange={handleBusyChange}
            disabled={saving}
          />
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground -mt-2 mb-3">
              Links appear on the product page after you <strong>Publish</strong> (Save draft alone
              does not update the live shop). Use full share URLs from Instagram or TikTok.
            </p>
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
            label="Video Thumbnail (optional)"
            hint="Format: JPG, WEBP, or PNG. Video thumbnail poster. Recommended size: match your video's dimension (e.g. 1920x1080 or 1080x1920)."
            urls={doc.productVideo?.poster ? [doc.productVideo.poster] : []}
            onChange={(urls) =>
              set("productVideo", { ...doc.productVideo, poster: urls[urls.length - 1] })
            }
            onBusyChange={handleBusyChange}
            disabled={saving}
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
            <p className="text-xs text-muted-foreground">
              Separate paragraphs with a blank line. Use <code># Heading</code>,{" "}
              <code>- list item</code>, <code>**bold**</code>, or{" "}
              <code>&gt; highlight</code> — the product page will style them.
            </p>
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

            {/* ── Optional Add-ons ─────────────────────────────────── */}
            <div className="pt-4 border-t space-y-3">
              <div>
                <h3 className="text-base font-semibold">Optional Add-ons</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Let customers add extras at checkout (e.g. a case, screen
                  protector). Each add-on appears as a toggle on the product
                  page.
                </p>
              </div>
              {(doc.addons ?? []).map((addon, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border p-4 space-y-3 bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Add-on {idx + 1}</p>
                    <button
                      type="button"
                      className="text-xs text-destructive hover:underline"
                      onClick={() => {
                        setNumbers((current) => ({ ...current, addons: current.addons.filter((_, i) => i !== idx) }));
                        set(
                          "addons",
                          (doc.addons ?? []).filter((_, i) => i !== idx),
                        );
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`addon-name-${idx}`}>Name</Label>
                      <Input
                        id={`addon-name-${idx}`}
                        value={addon.name}
                        placeholder="e.g. Silicone Cover"
                        onChange={(e) => {
                          const next = [...(doc.addons ?? [])];
                          next[idx] = { ...next[idx], name: e.target.value };
                          set("addons", next);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`addon-price-${idx}`}>
                        Extra Price (PKR)
                      </Label>
                      <Input
                        id={`addon-price-${idx}`}
                        type="text"
                        inputMode="decimal"
                        value={numbers.addons[idx] ?? ""}
                        placeholder="e.g. 299"
                        onChange={(e) => {
                          const raw = e.target.value;
                          setNumbers((current) => ({ ...current, addons: current.addons.map((value, index) => index === idx ? raw : value) }));
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`addon-badge-${idx}`}>
                        Badge (optional)
                      </Label>
                      <Input
                        id={`addon-badge-${idx}`}
                        value={addon.badge ?? ""}
                        placeholder="e.g. Popular"
                        onChange={(e) => {
                          const next = [...(doc.addons ?? [])];
                          next[idx] = { ...next[idx], badge: e.target.value };
                          set("addons", next);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`addon-desc-${idx}`}>
                        Short description
                      </Label>
                      <Input
                        id={`addon-desc-${idx}`}
                        value={addon.description ?? ""}
                        placeholder="e.g. Shockproof silicone"
                        onChange={(e) => {
                          const next = [...(doc.addons ?? [])];
                          next[idx] = {
                            ...next[idx],
                            description: e.target.value,
                          };
                          set("addons", next);
                        }}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <MediaField
                        label="Image (optional)"
                        hint="Format: JPG, WEBP, or PNG. Recommended size: 400x400px (Square) to prevent distortion."
                        urls={addon.image ? [addon.image] : []}
                        disabled={saving}
                        onBusyChange={handleBusyChange}
                        onChange={(urls) => {
                          const next = [...(doc.addons ?? [])];
                          next[idx] = { ...next[idx], image: urls[urls.length - 1] ?? "" };
                          set("addons", next);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-dashed border-muted-foreground/40 px-4 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                onClick={() => {
                  setNumbers((current) => ({ ...current, addons: [...current.addons, "0"] }));
                  set("addons", [
                    ...(doc.addons ?? []),
                    {
                      name: "",
                      price: 0,
                      badge: "",
                      description: "",
                      image: "",
                    },
                  ]);
                }}
              >
                + Add an add-on
              </button>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="price">Selling price (PKR)</Label>
            <Input
              id="price"
              type="text"
              inputMode="decimal"
              value={numbers.price}
              onChange={(e) => setNumbers((current) => ({ ...current, price: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compare">Compare-at price (PKR, optional)</Label>
            <Input
              id="compare"
              type="text"
              inputMode="decimal"
              value={numbers.compare}
              onChange={(e) => setNumbers((current) => ({ ...current, compare: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cost">Your cost (hidden from shop)</Label>
            <Input
              id="cost"
              type="text"
              inputMode="decimal"
              value={numbers.cost}
              onChange={(e) => setNumbers((current) => ({ ...current, cost: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Internal cost (not shown on the shop).
            </p>
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
              onChange={(e) => adjustInventory(e.target.value)}
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
              type="text"
              inputMode="numeric"
              value={numbers.quantity}
              onChange={(e) => {
                const raw = e.target.value;
                setNumbers((current) => ({ ...current, quantity: raw }));
                adjustInventory();
              }}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for untracked quantity; availability still applies.
              Zero marks the product sold out. Units are shared across all variants.
            </p>
            {doc.inventoryIntent?.mode === "adjust" ? <div className="space-y-2 text-sm">
              <p>Stock adjustment pending publication. If live inventory changed, reload to review it before choosing an adjustment.</p>
              <Button type="button" variant="outline" onClick={() => {
                const live = liveInventoryRef.current;
                setDoc((current) => ({ ...current, quantity: live.quantity, stockStatus: live.stockStatus, inventoryIntent: { mode: "preserve" } }));
                setNumbers((current) => ({ ...current, quantity: live.quantity == null ? "" : String(live.quantity) }));
              }}>Keep live inventory</Button>
            </div> : null}
          </div>
          <VariantAxesFields
            disabled={saving || activeUploads > 0}
            onBusyChange={handleBusyChange}
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
          <div className="space-y-1.5">
            <Label htmlFor="badge">Card tag</Label>
            <Input
              id="badge"
              value={doc.badge ?? ""}
              onChange={(e) => set("badge", e.target.value)}
              placeholder="e.g. Budget Choice"
            />
            <p className="text-xs text-muted-foreground">
              Small label on the product card. Leave empty to hide it.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(doc.featured)}
              onChange={(e) => set("featured", e.target.checked)}
            />
            Featured — homepage spotlight
          </label>
          <label className="flex items-center gap-2 text-sm mt-1">
            <input
              type="checkbox"
              checked={Boolean(doc.freeShipping)}
              onChange={(e) => set("freeShipping", e.target.checked)}
            />
            Free Shipping — waive shipping fee if this is in cart
          </label>
          <ProductCollectionsFields
            collections={collectionList}
            selectedIds={selectedCollectionIds}
            productId={id}
            onChange={(ids, nextCollections) => {
              adjustCollections(ids);
              if (nextCollections) setCollectionList(nextCollections);
            }}
          />
          {doc.collectionIntent?.mode === "adjust" || Array.isArray(doc._collectionIds) ? (
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>{doc.collectionIntent?.mode === "adjust" ? "Collection changes will be checked against their original revision when published." : "Older saved collection selections require explicit review before publishing."}</p>
              {doc.collectionIntent === undefined ? <Button type="button" variant="outline" onClick={() => adjustCollections([...selectedCollectionIds])}>Use selected collections</Button> : null}
              <Button type="button" variant="outline" onClick={() => {
                const ids = [...savedCollectionIdsRef.current];
                setSelectedCollectionIds(ids); collectionIdsRef.current = ids;
                setDoc((current) => { const next = { ...current, collectionIntent: { mode: "preserve" as const } }; delete next._collectionIds; return next; });
              }}>Keep live collections</Button>
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(doc.isDemo)}
              onChange={(e) => set("isDemo", e.target.checked)}
            />
            Practice product — guests cannot see this
          </label>
        </div>
      </fieldset>
    </div>
  );
}
