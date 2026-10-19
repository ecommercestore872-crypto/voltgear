import { adminDraftBag, chromeLinksField } from "@/lib/admin-draft";
import { SHOPPER_BRAND, shouldReplaceBrandName } from "@/lib/brand";
import {
  DEFAULT_FOOTER_CARE_LINKS,
  DEFAULT_FOOTER_COMPANY_LINKS,
  DEFAULT_HELP_LINKS,
  DEFAULT_NAV_LINKS,
} from "@/lib/chrome-nav-rules";
import type { PublishStatus } from "@/lib/db/publish";
import { normalizeSettingsSocialLinks } from "@/lib/settings-social";

export type SettingsRow = Record<string, unknown> & {
  status?: PublishStatus;
  draft?: Record<string, unknown> | null;
};

function stringValue(value: unknown): string {
  return value == null ? "" : String(value);
}

export function settingsFormFromRow(row?: SettingsRow | null) {
  const draft = adminDraftBag(row);
  const social = normalizeSettingsSocialLinks(
    draft.socialLinks ?? row?.social_links,
  );
  const brandName = stringValue(draft.brandName ?? row?.brand_name);

  return {
    brandName: shouldReplaceBrandName(brandName)
      ? SHOPPER_BRAND.spokenName
      : brandName,
    tagline: stringValue(draft.tagline ?? row?.tagline),
    logo: stringValue(draft.logo ?? row?.logo_url),
    email: stringValue(draft.email ?? row?.email),
    phone: stringValue(draft.phone ?? row?.phone),
    address: stringValue(draft.address ?? row?.address),
    whatsappNumber: stringValue(
      draft.whatsappNumber ?? row?.whatsapp_number,
    ),
    whatsappConfirmFlow: Boolean(
      draft.whatsappConfirmFlow ?? row?.whatsapp_confirm_flow,
    ),
    currency: stringValue(draft.currency ?? row?.currency),
    freeShippingThreshold: stringValue(
      draft.freeShippingThreshold ?? row?.free_shipping_threshold,
    ),
    codEnabled: Boolean((draft.codEnabled ?? row?.cod_enabled) ?? true),
    warrantyMonths: stringValue(
      draft.warrantyMonths ?? row?.warranty_months,
    ),
    returnWindowDays: stringValue(
      draft.returnWindowDays ?? row?.return_window_days,
    ),
    maxCodAmount: stringValue(draft.maxCodAmount ?? row?.max_cod_amount),
    shippingFee: stringValue(draft.shippingFee ?? row?.shipping_fee),
    returnPolicy: stringValue(draft.returnPolicy ?? row?.return_policy),
    warrantyInfo: stringValue(draft.warrantyInfo ?? row?.warranty_info),
    instagram: social.find((item) => item.platform === "instagram")?.url ?? "",
    tiktok: social.find((item) => item.platform === "tiktok")?.url ?? "",
    facebook: social.find((item) => item.platform === "facebook")?.url ?? "",
    announcementEnabled: Boolean(
      (draft.announcement as { enabled?: boolean } | undefined)?.enabled ??
        (row?.announcement as { enabled?: boolean } | undefined)?.enabled,
    ),
    announcementMessage: stringValue(
      (draft.announcement as { message?: string } | undefined)?.message ??
        (row?.announcement as { message?: string } | undefined)?.message,
    ),
    announcementCountdownEnabled: Boolean(
      (draft.announcement as { countdownEnabled?: boolean } | undefined)
        ?.countdownEnabled ??
        (row?.announcement as { countdownEnabled?: boolean } | undefined)
          ?.countdownEnabled,
    ),
    announcementStartsAt: stringValue(
      (draft.announcement as { startsAt?: string } | undefined)?.startsAt ??
        (row?.announcement as { startsAt?: string } | undefined)?.startsAt,
    ),
    announcementEndsAt: stringValue(
      (draft.announcement as { endsAt?: string } | undefined)?.endsAt ??
        (row?.announcement as { endsAt?: string } | undefined)?.endsAt,
    ),
    seoTitle: stringValue(
      (draft.seo as { title?: string } | undefined)?.title ??
        (row?.seo as { title?: string } | undefined)?.title,
    ),
    seoDescription: stringValue(
      (draft.seo as { description?: string } | undefined)?.description ??
        (row?.seo as { description?: string } | undefined)?.description,
    ),
    navLinks: chromeLinksField(
      draft.navLinks ?? row?.nav_links,
      DEFAULT_NAV_LINKS,
    ),
    headerLinks: chromeLinksField(draft.headerLinks ?? row?.header_links, []),
    helpLinks: chromeLinksField(
      draft.helpLinks ?? row?.help_links,
      DEFAULT_HELP_LINKS,
    ),
    footerCompanyLinks: chromeLinksField(
      draft.footerCompanyLinks ?? row?.footer_company_links,
      DEFAULT_FOOTER_COMPANY_LINKS,
    ),
    footerCareLinks: chromeLinksField(
      draft.footerCareLinks ?? row?.footer_care_links,
      DEFAULT_FOOTER_CARE_LINKS,
    ),
    homeBestsellersTitle: stringValue(
      draft.homeBestsellersTitle ?? row?.home_bestsellers_title,
    ),
    homeOffersTitle: stringValue(
      draft.homeOffersTitle ?? row?.home_offers_title,
    ),
    homeCategoriesTitle: stringValue(
      draft.homeCategoriesTitle ?? row?.home_categories_title,
    ),
    homeFeaturedEyebrow: stringValue(
      draft.homeFeaturedEyebrow ?? row?.home_featured_eyebrow,
    ),
    homeFeaturedTitle: stringValue(
      draft.homeFeaturedTitle ?? row?.home_featured_title,
    ),
    homeFeaturedSubtitle: stringValue(
      draft.homeFeaturedSubtitle ?? row?.home_featured_subtitle,
    ),
    homeFeaturedProductDescription: stringValue(
      draft.homeFeaturedProductDescription ??
        row?.home_featured_product_description,
    ),
    homeFeaturedProductSlug: stringValue(
      draft.homeFeaturedProductSlug ?? row?.home_featured_product_slug ?? "",
    ),
    homeFeaturedCustomImage: stringValue(
      draft.homeFeaturedCustomImage ?? row?.home_featured_custom_image ?? "",
    ),
    homeTrustHeadline: stringValue(
      draft.homeTrustHeadline ?? row?.home_trust_headline ?? "",
    ),
    homeTrustAccent: stringValue(
      draft.homeTrustAccent ?? row?.home_trust_accent ?? "",
    ),
    topbarAccent: stringValue(
      draft.topbarAccent ?? row?.topbar_accent ?? "",
    ),
    navShopAllText: stringValue(
      draft.navShopAllText ?? row?.nav_shop_all_text ?? "",
    ),
  };
}

export type SettingsFormState = ReturnType<typeof settingsFormFromRow>;

export type SettingsAction = "save" | "publish" | "discard";

export function buildSettingsActionRequest(
  action: SettingsAction,
  form: SettingsFormState,
) {
  return {
    path: "/api/admin/settings",
    init: {
      method: "PATCH" as const,
      body: JSON.stringify({ action, doc: buildSettingsDocument(form) }),
    },
  };
}

export function buildSettingsDocument(form: SettingsFormState) {
  const socialLinks = [
    form.instagram ? { platform: "instagram", url: form.instagram } : null,
    form.tiktok ? { platform: "tiktok", url: form.tiktok } : null,
    form.facebook ? { platform: "facebook", url: form.facebook } : null,
  ].filter(
    (link): link is { platform: string; url: string } => link !== null,
  );

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
    codEnabled: form.codEnabled,
    warrantyMonths: form.warrantyMonths
      ? Number(form.warrantyMonths)
      : undefined,
    returnWindowDays: form.returnWindowDays
      ? Number(form.returnWindowDays)
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
    headerLinks: form.headerLinks,
    helpLinks: form.helpLinks,
    footerCompanyLinks: form.footerCompanyLinks,
    footerCareLinks: form.footerCareLinks,
    homeBestsellersTitle: form.homeBestsellersTitle,
    homeOffersTitle: form.homeOffersTitle,
    homeCategoriesTitle: form.homeCategoriesTitle,
    homeFeaturedEyebrow: form.homeFeaturedEyebrow,
    homeFeaturedTitle: form.homeFeaturedTitle,
    homeFeaturedSubtitle: form.homeFeaturedSubtitle,
    homeFeaturedProductDescription: form.homeFeaturedProductDescription,
    homeFeaturedProductSlug: form.homeFeaturedProductSlug || null,
    homeFeaturedCustomImage: form.homeFeaturedCustomImage || null,
    homeTrustHeadline: form.homeTrustHeadline,
    homeTrustAccent: form.homeTrustAccent,
    topbarAccent: form.topbarAccent,
    navShopAllText: form.navShopAllText,
  };
}
