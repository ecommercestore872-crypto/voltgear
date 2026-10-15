import { unstable_cache } from "next/cache";

import { SHOPPER_BRAND, shouldReplaceBrandName } from "@/lib/brand";
import { sanitizeChromeLinks, validateChromeLists } from "@/lib/chrome-nav-rules";
import {
  normalizeHomeSections,
  placeSectionBefore,
  type HomeSectionEntry,
} from "@/lib/db/home-section-rules";
import { normalizeLifestyleShop } from "@/lib/db/lifestyle-shop-rules";
import { missingSchemaColumn, omitColumn } from "@/lib/db/product-column-fallback";
import {
  parseEmailSenderConfig,
  type EmailSenderConfig,
} from "@/lib/email-sender-rules";
import {
  invoiceTemplateOverrides,
  mergeInvoiceTemplate,
  type InvoiceTemplate,
} from "@/lib/invoice-template-rules";
import {
  parseOrderEmailConfig,
  type OrderEmailConfig,
} from "@/lib/order-email-cms-rules";
import {
  revalidateAdminCacheTag,
  revalidateAfterPublishLayout,
  revalidateShopMerchandising,
  revalidateShopMerchandisingLayout,
} from "@/lib/revalidate-storefront";
import { getServiceClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types";

const ADMIN_SETTINGS_CACHE_TAG = "admin-settings";

function db() {
  return getServiceClient({ admin: true });
}

async function loadAdminSettingsRow() {
  await ensureShopperBrandSettings();
  const { data, error } = await db().from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
}

/** Fresh row for writes — bypasses read cache. */
export async function getAdminSettingsForUpdate() {
  return loadAdminSettingsRow();
}

export async function getAdminSettings() {
  return unstable_cache(
    loadAdminSettingsRow,
    ["admin-site-settings-v1"],
    { revalidate: 120, tags: [ADMIN_SETTINGS_CACHE_TAG] },
  )();
}

function bumpAdminSettingsCache() {
  revalidateAdminCacheTag(ADMIN_SETTINGS_CACHE_TAG);
}

export async function ensureShopperBrandSettings() {
  const { data, error } = await db()
    .from("site_settings")
    .select("id, brand_name, seo, draft")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return;

  const liveName = String(data.brand_name ?? "");
  const draft =
    data.draft && typeof data.draft === "object"
      ? { ...(data.draft as Record<string, unknown>) }
      : null;
  const draftName = typeof draft?.brandName === "string" ? draft.brandName : "";
  const seo =
    data.seo && typeof data.seo === "object"
      ? { ...(data.seo as Record<string, unknown>) }
      : {};
  const seoTitle = String(seo.title ?? "");
  const seoDescription = String(seo.description ?? "");

  const replaceLive = shouldReplaceBrandName(liveName);
  const replaceDraft = Boolean(draft) && shouldReplaceBrandName(draftName || liveName);
  const replaceSeoTitle =
    !seoTitle.trim() ||
    shouldReplaceBrandName(seoTitle) ||
    /accessories hub|voltgear/i.test(seoTitle);
  const replaceSeoDescription =
    !seoDescription.trim() || /accessories hub|voltgear/i.test(seoDescription);

  if (!replaceLive && !replaceDraft && !replaceSeoTitle && !replaceSeoDescription) return;

  const payload: Record<string, unknown> = {};
  if (replaceLive) payload.brand_name = SHOPPER_BRAND.spokenName;
  if (replaceDraft && draft) {
    draft.brandName = SHOPPER_BRAND.spokenName;
    payload.draft = draft;
  }
  if (replaceSeoTitle || replaceSeoDescription) {
    payload.seo = {
      ...seo,
      title: replaceSeoTitle
        ? "Buy n Try — Earbuds, Airbuds, Smartwatches & Chargers in Pakistan"
        : seoTitle,
      description: replaceSeoDescription
        ? "Shop earbuds, airbuds, smartwatches, power banks and chargers at Buy n Try (buyntryy.com). Cash on delivery nationwide."
        : seoDescription,
    };
  }
  await db().from("site_settings").update(payload).eq("id", 1);
}

function settingsLiveRow(doc: Partial<SiteSettings> & Record<string, unknown>) {
  return {
    id: 1,
    brand_name: doc.brandName ?? "Store",
    tagline: doc.tagline ?? null,
    logo_url: doc.logo ?? null,
    primary_color: doc.primaryColor ?? null,
    secondary_color: doc.secondaryColor ?? null,
    theme: doc.theme ?? null,
    heading_font: doc.headingFont ?? null,
    body_font: doc.bodyFont ?? null,
    currency: doc.currency ?? null,
    email: doc.email ?? null,
    phone: doc.phone ?? null,
    address: doc.address ?? null,
    social_links: doc.socialLinks ?? null,
    header_links: Array.isArray(doc.headerLinks) ? sanitizeChromeLinks(doc.headerLinks) : null,
    free_shipping_threshold: doc.freeShippingThreshold ?? null,
    shipping_fee: doc.shippingFee ?? null,
    return_policy: doc.returnPolicy ?? null,
    warranty_info: doc.warrantyInfo ?? null,
    cod_enabled: doc.codEnabled ?? true,
    max_cod_amount:
      doc.maxCodAmount != null && Number.isFinite(Number(doc.maxCodAmount))
        ? Number(doc.maxCodAmount)
        : null,
    whatsapp_number: doc.whatsappNumber ?? null,
    whatsapp_confirm_flow: doc.whatsappConfirmFlow === true,
    warranty_months: doc.warrantyMonths ?? null,
    return_window_days: doc.returnWindowDays ?? null,
    announcement: doc.announcement ?? null,
    seo: doc.seo ?? null,
    nav_links: Array.isArray(doc.navLinks) ? sanitizeChromeLinks(doc.navLinks) : null,
    help_links: Array.isArray(doc.helpLinks) ? sanitizeChromeLinks(doc.helpLinks) : null,
    footer_company_links: Array.isArray(doc.footerCompanyLinks)
      ? sanitizeChromeLinks(doc.footerCompanyLinks)
      : null,
    footer_care_links: Array.isArray(doc.footerCareLinks)
      ? sanitizeChromeLinks(doc.footerCareLinks)
      : null,
    home_bestsellers_title: doc.homeBestsellersTitle ?? null,
    home_offers_title: doc.homeOffersTitle ?? null,
    home_categories_title: doc.homeCategoriesTitle ?? null,
    home_featured_eyebrow: doc.homeFeaturedEyebrow ?? null,
    home_featured_title: doc.homeFeaturedTitle ?? null,
    home_featured_subtitle: doc.homeFeaturedSubtitle ?? null,
    home_featured_product_description: doc.homeFeaturedProductDescription ?? null,
    home_featured_product_slug: doc.homeFeaturedProductSlug
      ? String(doc.homeFeaturedProductSlug).trim() || null
      : null,
    home_featured_custom_image: doc.homeFeaturedCustomImage
      ? String(doc.homeFeaturedCustomImage).trim() || null
      : null,
    home_trust_headline: doc.homeTrustHeadline ?? null,
    home_trust_accent: doc.homeTrustAccent ?? null,
    topbar_accent: doc.topbarAccent ?? null,
    nav_shop_all_text: doc.navShopAllText ?? null,
    status: "published",
    draft: null,
    ...(doc.orderEmails ? { order_emails: parseOrderEmailConfig(doc.orderEmails) } : {}),
    ...(doc.emailSenders ? { email_senders: parseEmailSenderConfig(doc.emailSenders) } : {}),
    ...(doc.invoiceTemplate ? { invoice_template: mergeInvoiceTemplate(doc.invoiceTemplate) } : {}),
  };
}

function mergeSettingsDraft(
  incoming: Record<string, unknown>,
  currentDraft: Record<string, unknown> | null
): Record<string, unknown> {
  const base =
    currentDraft && typeof currentDraft === "object" ? { ...currentDraft } : {};
  return { ...base, ...incoming };
}

function settingsPublishDraftLeftover(
  doc: Record<string, unknown>,
  currentDraft: Record<string, unknown> | null
): Record<string, unknown> {
  const leftover: Record<string, unknown> = {};
  if (!doc.orderEmails && currentDraft?.orderEmails) {
    leftover.orderEmails = parseOrderEmailConfig(currentDraft.orderEmails);
  }
  if (currentDraft?.productDeals) {
    leftover.productDeals = currentDraft.productDeals;
  }
  return leftover;
}

export async function saveAdminSettings(draft: Record<string, unknown>) {
  const current = await getAdminSettingsForUpdate();
  const currentDraft =
    current?.draft && typeof current.draft === "object"
      ? (current.draft as Record<string, unknown>)
      : null;
  const merged = mergeSettingsDraft(draft, currentDraft);
  const { error } = await db()
    .from("site_settings")
    .upsert({ id: 1, draft: merged }, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message, status: 500 };
  bumpAdminSettingsCache();
  return { ok: true as const };
}

export async function publishAdminSettings(doc: Record<string, unknown>) {
  const gate = validateChromeLists(doc);
  if (!gate.ok) return { ok: false as const, error: gate.error, status: 400 };
  const current = await getAdminSettingsForUpdate();
  const currentDraft =
    current?.draft && typeof current.draft === "object"
      ? (current.draft as Record<string, unknown>)
      : null;
  const leftover = settingsPublishDraftLeftover(doc, currentDraft);
  let payload: Record<string, unknown> = { ...settingsLiveRow(doc), draft: leftover };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await db().from("site_settings").upsert(payload, { onConflict: "id" });
    if (!error) {
      bumpAdminSettingsCache();
      void revalidateShopMerchandisingLayout("/");
      return { ok: true as const };
    }
    const missing = missingSchemaColumn(error);
    if (!missing || !(missing in payload)) {
      return { ok: false as const, error: error.message, status: 500 };
    }
    payload = omitColumn(payload, missing);
  }
  return { ok: false as const, error: "Settings columns are missing on the database.", status: 500 };
}

export function editorOrderEmails(row: Record<string, unknown> | null): OrderEmailConfig {
  const draft = row?.draft && typeof row.draft === "object" ? (row.draft as Record<string, unknown>) : null;
  if (draft?.orderEmails) return parseOrderEmailConfig(draft.orderEmails);
  return parseOrderEmailConfig(row?.order_emails);
}

export async function saveAdminOrderEmails(config: OrderEmailConfig) {
  const current = await getAdminSettingsForUpdate();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>), orderEmails: parseOrderEmailConfig(config) }
      : { orderEmails: parseOrderEmailConfig(config) };
  const { error } = await db().from("site_settings").upsert({ id: 1, draft }, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message, status: 500 };
  bumpAdminSettingsCache();
  return { ok: true as const };
}

async function stripOrderEmailsDraft() {
  const current = await getAdminSettingsForUpdate();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>) }
      : null;
  if (!draft || !("orderEmails" in draft)) return;
  delete draft.orderEmails;
  await db()
    .from("site_settings")
    .update({ draft: Object.keys(draft).length ? draft : null })
    .eq("id", 1);
}

export async function publishAdminOrderEmails(config: OrderEmailConfig) {
  const parsed = parseOrderEmailConfig(config);
  let payload: Record<string, unknown> = {
    order_emails: parsed,
    updated_at: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { error } = await db().from("site_settings").update(payload).eq("id", 1);
    if (!error) {
      if ("order_emails" in payload) await stripOrderEmailsDraft();
      bumpAdminSettingsCache();
      void revalidateAfterPublishLayout("/");
      return { ok: true as const };
    }
    const missing = missingSchemaColumn(error);
    if (!missing || !(missing in payload)) {
      return { ok: false as const, error: error.message, status: 500 };
    }
    payload = omitColumn(payload, missing);
  }
  return { ok: false as const, error: "Order email columns are missing on the database.", status: 500 };
}

export async function discardAdminOrderEmails() {
  const current = await getAdminSettingsForUpdate();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>) }
      : {};
  if (!("orderEmails" in draft)) return { ok: true as const };
  delete draft.orderEmails;
  const { error } = await db()
    .from("site_settings")
    .update({ draft: Object.keys(draft).length ? draft : null })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  bumpAdminSettingsCache();
  return { ok: true as const };
}

export function editorInvoiceTemplate(row: Record<string, unknown> | null): InvoiceTemplate {
  const draft = row?.draft && typeof row.draft === "object" ? (row.draft as Record<string, unknown>) : null;
  if (draft?.invoiceTemplate) return mergeInvoiceTemplate(draft.invoiceTemplate);
  return mergeInvoiceTemplate(row?.invoice_template);
}

export async function saveAdminInvoiceTemplate(config: InvoiceTemplate | Partial<InvoiceTemplate>) {
  const current = await getAdminSettingsForUpdate();
  const parsed = invoiceTemplateOverrides(config);
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>), invoiceTemplate: parsed }
      : { invoiceTemplate: parsed };
  const { error } = await db().from("site_settings").upsert({ id: 1, draft }, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message, status: 500 };
  bumpAdminSettingsCache();
  return { ok: true as const };
}

async function stripInvoiceTemplateDraft() {
  const current = await getAdminSettingsForUpdate();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>) }
      : null;
  if (!draft || !("invoiceTemplate" in draft)) return;
  delete draft.invoiceTemplate;
  await db()
    .from("site_settings")
    .update({ draft: Object.keys(draft).length ? draft : null })
    .eq("id", 1);
}

export async function publishAdminInvoiceTemplate(config: InvoiceTemplate | Partial<InvoiceTemplate>) {
  const parsed = invoiceTemplateOverrides(config);
  let payload: Record<string, unknown> = {
    invoice_template: parsed,
    updated_at: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { error } = await db().from("site_settings").update(payload).eq("id", 1);
    if (!error) {
      if ("invoice_template" in payload) await stripInvoiceTemplateDraft();
      bumpAdminSettingsCache();
      void revalidateAfterPublishLayout("/");
      return { ok: true as const };
    }
    const missing = missingSchemaColumn(error);
    if (!missing || !(missing in payload)) {
      return { ok: false as const, error: error.message, status: 500 };
    }
    payload = omitColumn(payload, missing);
  }
  return {
    ok: false as const,
    error: "Invoice template column is missing. Push migration 20260905080000_invoice_template.sql.",
    status: 500,
  };
}

export async function discardAdminInvoiceTemplate() {
  const current = await getAdminSettingsForUpdate();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>) }
      : {};
  if (!("invoiceTemplate" in draft)) return { ok: true as const };
  delete draft.invoiceTemplate;
  const { error } = await db()
    .from("site_settings")
    .update({ draft: Object.keys(draft).length ? draft : null })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  bumpAdminSettingsCache();
  return { ok: true as const };
}

export function editorEmailSenders(row: Record<string, unknown> | null): EmailSenderConfig {
  const draft = row?.draft && typeof row.draft === "object" ? (row.draft as Record<string, unknown>) : null;
  if (draft?.emailSenders) return parseEmailSenderConfig(draft.emailSenders);
  return parseEmailSenderConfig(row?.email_senders);
}

export async function saveAdminEmailSenders(config: EmailSenderConfig) {
  const current = await getAdminSettingsForUpdate();
  const parsed = parseEmailSenderConfig(config);
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>), emailSenders: parsed }
      : { emailSenders: parsed };
  const { error } = await db().from("site_settings").upsert({ id: 1, draft }, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message, status: 500 };
  bumpAdminSettingsCache();
  return { ok: true as const };
}

async function stripEmailSendersDraft() {
  const current = await getAdminSettingsForUpdate();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>) }
      : null;
  if (!draft || !("emailSenders" in draft)) return;
  delete draft.emailSenders;
  await db()
    .from("site_settings")
    .update({ draft: Object.keys(draft).length ? draft : null })
    .eq("id", 1);
}

export async function publishAdminEmailSenders(config: EmailSenderConfig) {
  const parsed = parseEmailSenderConfig(config);
  let payload: Record<string, unknown> = {
    email_senders: parsed,
    updated_at: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { error } = await db().from("site_settings").update(payload).eq("id", 1);
    if (!error) {
      if (!("email_senders" in payload)) {
        return {
          ok: false as const,
          error:
            "Email sending column is missing. Push migration 20260906140000_email_senders.sql.",
          status: 500,
        };
      }
      await stripEmailSendersDraft();
      bumpAdminSettingsCache();
      void revalidateAfterPublishLayout("/");
      return { ok: true as const };
    }
    const missing = missingSchemaColumn(error);
    if (!missing || !(missing in payload)) {
      return { ok: false as const, error: error.message, status: 500 };
    }
    payload = omitColumn(payload, missing);
  }
  return {
    ok: false as const,
    error: "Email sending column is missing. Push migration 20260906140000_email_senders.sql.",
    status: 500,
  };
}

export async function discardAdminEmailSenders() {
  const current = await getAdminSettingsForUpdate();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>) }
      : {};
  if (!("emailSenders" in draft)) return { ok: true as const };
  delete draft.emailSenders;
  const { error } = await db()
    .from("site_settings")
    .update({ draft: Object.keys(draft).length ? draft : null })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  bumpAdminSettingsCache();
  return { ok: true as const };
}

export async function discardAdminSettingsDraft() {
  const { error } = await db().from("site_settings").update({ draft: null }).eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  bumpAdminSettingsCache();
  return { ok: true as const };
}

export async function saveAdminHomeSections(sections: HomeSectionEntry[]) {
  const normalized = normalizeHomeSections(sections);
  const { error } = await db()
    .from("site_settings")
    .update({ home_sections: normalized })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  bumpAdminSettingsCache();
  void revalidateShopMerchandising("/", "/admin/home");
  return { ok: true as const, sections: normalized };
}

export async function saveAdminLifestyleShop(raw: unknown) {
  const shop = normalizeLifestyleShop(raw);
  const current = await getAdminSettingsForUpdate();
  const enabled = normalizeHomeSections(current?.home_sections).map((section) =>
    section.id === "lifestyle" ? { ...section, enabled: true } : section
  );
  const sections =
    enabled[0]?.id === "lifestyle"
      ? placeSectionBefore(enabled, "lifestyle", "reviews")
      : enabled;

  let payload: Record<string, unknown> = {
    lifestyle_shop: shop,
    home_sections: sections,
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { error } = await db().from("site_settings").update(payload).eq("id", 1);
    if (!error) {
      bumpAdminSettingsCache();
      void revalidateShopMerchandising("/", "/admin/home");
      return { ok: true as const, shop, sections };
    }
    const missing = missingSchemaColumn(error);
    if (missing === "lifestyle_shop") {
      return {
        ok: false as const,
        error:
          "Lifestyle shop column is missing. Run migration 20260905070000_lifestyle_shop.sql in Supabase.",
        status: 500,
      };
    }
    if (missing && missing in payload) {
      payload = omitColumn(payload, missing);
      continue;
    }
    return { ok: false as const, error: error.message, status: 500 };
  }

  return { ok: false as const, error: "Could not save lifestyle shop.", status: 500 };
}
