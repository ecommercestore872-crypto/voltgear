"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ChromeLinkList } from "@/components/admin/chrome-link-list";
import { PublishBar } from "@/components/admin/publish-bar";
import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { AdminStickyPublishBar } from "@/components/admin/admin-sticky-publish-bar";
import { useAdminFormDirty } from "@/components/admin/use-admin-form-dirty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaField } from "@/components/admin/media-field";
import type { PublishStatus } from "@/lib/db/publish";
import type { ChromeLink } from "@/lib/chrome-nav-rules";
import {
  buildSettingsDocument,
  settingsFormFromRow,
  type SettingsRow,
} from "@/lib/admin-settings-form-rules";

type FeaturedProductOption = {
  _id: string;
  name: string;
  slug: string;
  category: string;
};

export function SettingsForm({
  settings,
  shopCategories = [],
  initialFeaturedProduct = null,
}: {
  settings?: SettingsRow | null;
  shopCategories?: { slug: string; name: string }[];
  initialFeaturedProduct?: FeaturedProductOption | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => settingsFormFromRow(settings));
  const [status, setStatus] = useState<PublishStatus>(
    settings?.status ?? "published",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return initialFeaturedProduct?.category ?? "";
  });
  const [categoryProducts, setCategoryProducts] = useState<FeaturedProductOption[]>(
    () => (initialFeaturedProduct ? [initialFeaturedProduct] : []),
  );
  const [productQ, setProductQ] = useState("");
  const [productSearchHits, setProductSearchHits] = useState<FeaturedProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    const needle = productQ.trim();
    if (needle.length < 2) {
      setProductSearchHits([]);
      return;
    }
    setLoadingProducts(true);
    const handle = window.setTimeout(() => {
      void adminFetch(`/api/admin/products?q=${encodeURIComponent(needle)}`)
        .then((json: { products?: FeaturedProductOption[] }) => {
          setProductSearchHits(json.products ?? []);
        })
        .catch(() => setProductSearchHits([]))
        .finally(() => setLoadingProducts(false));
    }, 350);
    return () => window.clearTimeout(handle);
  }, [productQ]);

  useEffect(() => {
    if (!selectedCategory) {
      setCategoryProducts(initialFeaturedProduct ? [initialFeaturedProduct] : []);
      return;
    }
    setLoadingProducts(true);
    void adminFetch(
      `/api/admin/products?category=${encodeURIComponent(selectedCategory)}&pageSize=48`,
    )
      .then((json: { products?: FeaturedProductOption[] }) => {
        const list = json.products ?? [];
        const slug = form.homeFeaturedProductSlug;
        if (
          slug &&
          initialFeaturedProduct?.slug === slug &&
          !list.some((p) => p.slug === slug)
        ) {
          setCategoryProducts([initialFeaturedProduct, ...list]);
        } else {
          setCategoryProducts(list);
        }
      })
      .catch(() =>
        setCategoryProducts(initialFeaturedProduct ? [initialFeaturedProduct] : []),
      )
      .finally(() => setLoadingProducts(false));
  }, [selectedCategory, initialFeaturedProduct, form.homeFeaturedProductSlug]);

  const pickerProducts =
    productQ.trim().length >= 2 ? productSearchHits : categoryProducts;

  const { dirty, syncSaved, resetSaved } = useAdminFormDirty(form);

  async function run(action: "save" | "publish" | "discard") {
    setSaving(true);
    setError(null);
    try {
      await adminFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ action, doc: buildSettingsDocument(form) }),
      });
      if (action === "publish") setStatus("published");
      if (action === "discard") {
        const reset = settingsFormFromRow({ ...settings, draft: null });
        setForm(reset);
        resetSaved(reset);
      } else {
        syncSaved();
      }
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      {/* Command Center Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Global Settings
            </h1>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-slate-500/10 to-gray-500/10 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/30">
              System Root
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Configure core platform mechanics. Manage brand identity, localized shipping rules, operational toggles, and global SEO metadata.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Sticky Publish Bar Overlay */}
      <div className="sticky top-4 z-50 rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-md bg-white/70 dark:bg-zinc-900/80">
        <AdminStickyPublishBar>
          <PublishBar
            status={status}
            dirty={dirty}
            saving={saving}
            onSave={() => run("save")}
            onPublish={() => run("publish")}
            onDiscard={() => run("discard")}
            hideUnpublish
          />
        </AdminStickyPublishBar>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 mt-8">
        {(
          [
            ["brandName", "Brand name"],
            ["tagline", "Tagline"],
            ["logo", "Logo URL"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["whatsappNumber", "WhatsApp"],
            ["currency", "Currency"],
            ["maxCodAmount", "Max COD (Requires Advance >)"],
            ["freeShippingThreshold", "Free shipping threshold"],
            ["warrantyMonths", "Warranty Months"],
            ["returnWindowDays", "Return Window Days"],
            ["shippingFee", "Shipping fee"],
            ["instagram", "Instagram URL"],
            ["tiktok", "TikTok URL"],
            ["facebook", "Facebook URL"],
            ["seoTitle", "SEO title"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label>{label}</Label>
            <Input
              value={form[key]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: e.target.value }))
              }
            />
          </div>
        ))}

        <label className="sm:col-span-2 flex items-center gap-2 p-4 mt-2 rounded-lg border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
          <input
            type="checkbox"
            checked={form.codEnabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, codEnabled: e.target.checked }))
            }
            className="h-5 w-5 rounded border-primary accent-primary"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold">
              Enable Cash on Delivery
            </span>
            <span className="text-xs text-muted-foreground">
              If enabled, COD will show as a pre-footer trust badge.
            </span>
          </div>
        </label>

        <label className="sm:col-span-2 flex items-center gap-2 p-4 mt-2 rounded-lg border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
          <input
            type="checkbox"
            checked={form.whatsappConfirmFlow}
            onChange={(e) =>
              setForm((f) => ({ ...f, whatsappConfirmFlow: e.target.checked }))
            }
            className="h-5 w-5 rounded border-primary accent-primary"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold">
              Require WhatsApp Confirmation for COD Orders
            </span>
            <span className="text-xs text-muted-foreground">
              If enabled, customers will see a huge "Confirm via WhatsApp"
              deep-link on the thank you page matching your WhatsApp number.
            </span>
          </div>
        </label>

        <p className="sm:col-span-2 text-xs text-muted-foreground">
          New-order alerts go to <code>ORDER_NOTIFY_EMAIL</code> if set,
          otherwise this contact email. From addresses per job:{" "}
          <Link
            href="/admin/email-sending"
            className="underline underline-offset-2"
          >
            Email sending
          </Link>
          . Letter copy and layout:{" "}
          <Link
            href="/admin/order-emails"
            className="underline underline-offset-2"
          >
            Order emails
          </Link>
          {" · "}
          <Link href="/admin/invoice" className="underline underline-offset-2">
            Invoice PDF
          </Link>
          . Footer subscribers are under Customers → Newsletter. Empty logo
          keeps the BNT seal in the navbar and footer. Empty link lists hide
          that group on the shop.
        </p>
        <ChromeLinkList
          title="Navbar links"
          hint="Shown next to Shop. Categories stay under Admin → Categories."
          links={form.navLinks}
          onChange={(navLinks: ChromeLink[]) =>
            setForm((f) => ({ ...f, navLinks }))
          }
        />
        <ChromeLinkList
          title="Header Links"
          hint="Shown at the very top (e.g. tracking, contact us)."
          links={form.headerLinks}
          onChange={(headerLinks: ChromeLink[]) =>
            setForm((f) => ({ ...f, headerLinks }))
          }
        />
        <ChromeLinkList
          title="Help links"
          links={form.helpLinks}
          onChange={(helpLinks: ChromeLink[]) =>
            setForm((f) => ({ ...f, helpLinks }))
          }
        />
        <ChromeLinkList
          title="Footer — Company"
          links={form.footerCompanyLinks}
          onChange={(footerCompanyLinks: ChromeLink[]) =>
            setForm((f) => ({ ...f, footerCompanyLinks }))
          }
        />
        <ChromeLinkList
          title="Footer — Care"
          links={form.footerCareLinks}
          onChange={(footerCareLinks: ChromeLink[]) =>
            setForm((f) => ({ ...f, footerCareLinks }))
          }
        />
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Address</Label>
          <Textarea
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Return policy</Label>
          <Textarea
            value={form.returnPolicy}
            onChange={(e) =>
              setForm((f) => ({ ...f, returnPolicy: e.target.value }))
            }
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Warranty</Label>
          <Textarea
            value={form.warrantyInfo}
            onChange={(e) =>
              setForm((f) => ({ ...f, warrantyInfo: e.target.value }))
            }
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>SEO description</Label>
          <Textarea
            value={form.seoDescription}
            onChange={(e) =>
              setForm((f) => ({ ...f, seoDescription: e.target.value }))
            }
          />
        </div>
        
        <div className="sm:col-span-2 space-y-4 rounded-lg border p-4 bg-muted/20 mt-4">
          <h3 className="font-semibold text-base mb-1">
            Homepage Typography
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Customize the text for dynamic homepage sections.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["homeFeaturedEyebrow", "Featured Section Eyebrow (e.g. Featured)"],
              ["homeFeaturedTitle", "Featured Section Title (e.g. Staff pick)"],
              ["homeBestsellersTitle", "Bestsellers Title"],
              ["homeOffersTitle", "Offers Title"],
              ["homeCategoriesTitle", "Categories Banner Title"],
              ["homeTrustHeadline", "Trust Strip Headline (e.g. Exceptional Quality)"],
              ["homeTrustAccent", "Trust Strip Accent (e.g. Delivered)"],
              ["topbarAccent", "Topbar Message (e.g. Cash on delivery)"],
              ["navShopAllText", "Navbar 'All products' Link Text"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div className="sm:col-span-2 space-y-1.5 mt-2">
              <Label>Featured Section Subtitle</Label>
              <Textarea
                value={form.homeFeaturedSubtitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, homeFeaturedSubtitle: e.target.value }))
                }
                placeholder="One standout product worth a closer look — clear price, ready to buy."
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5 mt-2">
              <Label>Product Description Override (Optional)</Label>
              <Textarea
                value={form.homeFeaturedProductDescription}
                onChange={(e) =>
                  setForm((f) => ({ ...f, homeFeaturedProductDescription: e.target.value }))
                }
                placeholder="Leave blank to use the product's default Short Description."
              />
            </div>
            
            <div className="sm:col-span-2 pt-4 border-t border-primary/10 mt-2 space-y-4">
              <h4 className="font-semibold text-sm">Target Featured Product (Staff Pick)</h4>
              <p className="text-xs text-muted-foreground mb-4">
                By default this automatically selects a product. Want a specific one? Select it manually below.
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Filter by Category</Label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setProductQ("");
                      if (form.homeFeaturedProductSlug) {
                        const p =
                          initialFeaturedProduct?.slug === form.homeFeaturedProductSlug
                            ? initialFeaturedProduct
                            : pickerProducts.find(
                                (prod) => prod.slug === form.homeFeaturedProductSlug,
                              );
                        if (p && e.target.value && p.category !== e.target.value) {
                          setForm((f) => ({ ...f, homeFeaturedProductSlug: "" }));
                        }
                      }
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">All categories (search below)</option>
                    {shopCategories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Search product (optional)</Label>
                  <Input
                    value={productQ}
                    onChange={(e) => setProductQ(e.target.value)}
                    placeholder="Type 2+ characters to search catalog…"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Override Target Product</Label>
                  <select
                    value={form.homeFeaturedProductSlug}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, homeFeaturedProductSlug: e.target.value }))
                    }
                    disabled={loadingProducts && pickerProducts.length === 0}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
                  >
                    <option value="">-- Dynamic Auto Select --</option>
                    {pickerProducts.map((p) => (
                      <option key={p._id} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {loadingProducts ? (
                    <p className="text-xs text-muted-foreground">Loading products…</p>
                  ) : null}
                </div>
                
                <div className="sm:col-span-2 space-y-1.5 mt-4">
                  <MediaField
                    label="Custom Banner Layout Image (Optional)"
                    hint="Recommended size: 1000 × 1000px (1:1 Square) transparent PNG or high-res JPG. This replaces the default product image exclusively in the banner."
                    urls={form.homeFeaturedCustomImage ? [form.homeFeaturedCustomImage] : []}
                    onChange={(urls) =>
                      setForm((f) => ({ ...f, homeFeaturedCustomImage: urls[0] || "" }))
                    }
                    onBusyChange={setSaving}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
        <div className="sm:col-span-2 space-y-4 rounded-lg border p-4 bg-muted/20">
          <h3 className="font-semibold text-base mb-1">
            Campaign / Announcement Bar
          </h3>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.announcementEnabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  announcementEnabled: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded"
            />
            Show announcement bar
          </label>

          {form.announcementEnabled && (
            <div className="space-y-4 mt-3">
              <div className="space-y-1.5">
                <Label>Announcement Message</Label>
                <Input
                  placeholder="e.g. Blessed Friday: Up to 50% OFF!"
                  value={form.announcementMessage}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      announcementMessage: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="pt-4 border-t mt-4 space-y-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.announcementCountdownEnabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        announcementCountdownEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded"
                  />
                  Enable countdown timer
                </label>

                {form.announcementCountdownEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Starts At</Label>
                      <Input
                        type="datetime-local"
                        value={form.announcementStartsAt}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            announcementStartsAt: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Ends At</Label>
                      <Input
                        type="datetime-local"
                        value={form.announcementEndsAt}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            announcementEndsAt: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
