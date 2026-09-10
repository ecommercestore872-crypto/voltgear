"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ChromeLinkList } from "@/components/admin/chrome-link-list";
import { PublishBar } from "@/components/admin/publish-bar";
import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublishStatus } from "@/lib/db/publish";
import {
  DEFAULT_FOOTER_CARE_LINKS,
  DEFAULT_FOOTER_COMPANY_LINKS,
  DEFAULT_HELP_LINKS,
  DEFAULT_NAV_LINKS,
  parseChromeLinks,
  type ChromeLink,
} from "@/lib/chrome-nav-rules";
import { SHOPPER_BRAND, shouldReplaceBrandName } from "@/lib/brand";

type SettingsRow = Record<string, unknown> & {
  status?: PublishStatus;
  draft?: Record<string, unknown> | null;
};

function str(v: unknown) {
  return v == null ? "" : String(v);
}

function fromRow(row?: SettingsRow | null) {
  const d = row?.draft ?? {};
  const social = (d.socialLinks ?? row?.social_links) as
    { platform?: string; url?: string }[] | undefined;
  return {
    brandName: shouldReplaceBrandName(str(d.brandName ?? row?.brand_name))
      ? SHOPPER_BRAND.spokenName
      : str(d.brandName ?? row?.brand_name),
    tagline: str(d.tagline ?? row?.tagline),
    logo: str(d.logo ?? row?.logo_url),
    email: str(d.email ?? row?.email),
    phone: str(d.phone ?? row?.phone),
    address: str(d.address ?? row?.address),
    whatsappNumber: str(d.whatsappNumber ?? row?.whatsapp_number),
    whatsappConfirmFlow: Boolean(
      d.whatsappConfirmFlow ?? row?.whatsapp_confirm_flow,
    ),
    currency: str(d.currency ?? row?.currency),
    freeShippingThreshold: str(
      d.freeShippingThreshold ?? row?.free_shipping_threshold,
    ),
    maxCodAmount: str(d.maxCodAmount ?? row?.max_cod_amount),
    shippingFee: str(d.shippingFee ?? row?.shipping_fee),
    returnPolicy: str(d.returnPolicy ?? row?.return_policy),
    warrantyInfo: str(d.warrantyInfo ?? row?.warranty_info),
    instagram: social?.find((s) => s.platform === "instagram")?.url ?? "",
    tiktok: social?.find((s) => s.platform === "tiktok")?.url ?? "",
    facebook: social?.find((s) => s.platform === "facebook")?.url ?? "",
    announcementEnabled: Boolean(
      (d.announcement as { enabled?: boolean } | undefined)?.enabled ??
      (row?.announcement as { enabled?: boolean } | undefined)?.enabled,
    ),
    announcementMessage: str(
      (d.announcement as { message?: string } | undefined)?.message ??
        (row?.announcement as { message?: string } | undefined)?.message,
    ),
    announcementCountdownEnabled: Boolean(
      (d.announcement as { countdownEnabled?: boolean } | undefined)
        ?.countdownEnabled ??
      (row?.announcement as { countdownEnabled?: boolean } | undefined)
        ?.countdownEnabled,
    ),
    announcementStartsAt: str(
      (d.announcement as { startsAt?: string } | undefined)?.startsAt ??
        (row?.announcement as { startsAt?: string } | undefined)?.startsAt,
    ),
    announcementEndsAt: str(
      (d.announcement as { endsAt?: string } | undefined)?.endsAt ??
        (row?.announcement as { endsAt?: string } | undefined)?.endsAt,
    ),
    seoTitle: str(
      (d.seo as { title?: string } | undefined)?.title ??
        (row?.seo as { title?: string } | undefined)?.title,
    ),
    seoDescription: str(
      (d.seo as { description?: string } | undefined)?.description ??
        (row?.seo as { description?: string } | undefined)?.description,
    ),
    navLinks:
      parseChromeLinks(d.navLinks ?? row?.nav_links) ?? DEFAULT_NAV_LINKS,
    helpLinks:
      parseChromeLinks(d.helpLinks ?? row?.help_links) ?? DEFAULT_HELP_LINKS,
    footerCompanyLinks:
      parseChromeLinks(d.footerCompanyLinks ?? row?.footer_company_links) ??
      DEFAULT_FOOTER_COMPANY_LINKS,
    footerCareLinks:
      parseChromeLinks(d.footerCareLinks ?? row?.footer_care_links) ??
      DEFAULT_FOOTER_CARE_LINKS,
    homeBestsellersTitle: str(d.homeBestsellersTitle ?? row?.home_bestsellers_title),
    homeOffersTitle: str(d.homeOffersTitle ?? row?.home_offers_title),
    homeCategoriesTitle: str(d.homeCategoriesTitle ?? row?.home_categories_title),
    homeFeaturedEyebrow: str(d.homeFeaturedEyebrow ?? row?.home_featured_eyebrow),
    homeFeaturedTitle: str(d.homeFeaturedTitle ?? row?.home_featured_title),
    homeFeaturedSubtitle: str(d.homeFeaturedSubtitle ?? row?.home_featured_subtitle),
  };
}

export function SettingsForm({ settings }: { settings?: SettingsRow | null }) {
  const router = useRouter();
  const [form, setForm] = useState(() => fromRow(settings));
  const [status, setStatus] = useState<PublishStatus>(
    settings?.status ?? "published",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function doc() {
    const socialLinks = [
      form.instagram ? { platform: "instagram", url: form.instagram } : null,
      form.tiktok ? { platform: "tiktok", url: form.tiktok } : null,
      form.facebook ? { platform: "facebook", url: form.facebook } : null,
    ].filter(Boolean);
    return {
      brandName: form.brandName,
      tagline: form.tagline,
      logo: form.logo,
      email: form.email,
      phone: form.phone,
      address: form.address,
      whatsappNumber: form.whatsappNumber,
      whatsappConfirmFlow: form.whatsappConfirmFlow,
      currency: form.currency,
      freeShippingThreshold: form.freeShippingThreshold
        ? Number(form.freeShippingThreshold)
        : undefined,
      maxCodAmount: form.maxCodAmount ? Number(form.maxCodAmount) : undefined,
      shippingFee: form.shippingFee ? Number(form.shippingFee) : undefined,
      returnPolicy: form.returnPolicy,
      warrantyInfo: form.warrantyInfo,
      socialLinks,
      announcement: {
        enabled: form.announcementEnabled,
        message: form.announcementMessage,
        countdownEnabled: form.announcementCountdownEnabled,
        startsAt: form.announcementStartsAt || null,
        endsAt: form.announcementEndsAt || null,
      },
      seo: { title: form.seoTitle, description: form.seoDescription },
      navLinks: form.navLinks,
      helpLinks: form.helpLinks,
      footerCompanyLinks: form.footerCompanyLinks,
      footerCareLinks: form.footerCareLinks,
      homeBestsellersTitle: form.homeBestsellersTitle,
      homeOffersTitle: form.homeOffersTitle,
      homeCategoriesTitle: form.homeCategoriesTitle,
      homeFeaturedEyebrow: form.homeFeaturedEyebrow,
      homeFeaturedTitle: form.homeFeaturedTitle,
      homeFeaturedSubtitle: form.homeFeaturedSubtitle,
    };
  }

  async function run(action: "save" | "publish" | "discard") {
    setSaving(true);
    setError(null);
    try {
      await adminFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ action, doc: doc() }),
      });
      if (action === "publish") setStatus("published");
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <PublishBar
        status={status}
        saving={saving}
        onSave={() => run("save")}
        onPublish={() => run("publish")}
        onDiscard={() => run("discard")}
        hideUnpublish
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
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
