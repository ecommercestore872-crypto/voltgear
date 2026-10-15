"use client";

import dynamic from "next/dynamic";

export const MetaPixel = dynamic(
  () => import("@/components/analytics/meta-pixel").then((module) => module.MetaPixel),
  { ssr: false, loading: () => null },
);

export const ClarityDeferred = dynamic(
  () => import("@/components/analytics/clarity-deferred").then((module) => module.ClarityDeferred),
  { ssr: false, loading: () => null },
);

export const StorefrontAnnouncementBar = dynamic(
  () => import("@/components/promotions/announcement-bar").then((module) => module.StorefrontAnnouncementBar),
  { ssr: false, loading: () => null },
);

export const ScrollToTopButton = dynamic(
  () => import("@/components/ui/scroll-to-top-button").then((module) => module.ScrollToTopButton),
  { ssr: false, loading: () => null },
);

export const CartDrawer = dynamic(
  () => import("@/components/cart/cart-drawer").then((module) => module.CartDrawer),
  { ssr: false, loading: () => null },
);

export const ReviewReminderPopup = dynamic(
  () => import("@/components/reviews/review-reminder-popup").then((module) => module.ReviewReminderPopup),
  { ssr: false, loading: () => null },
);

export const CartEffects = dynamic(
  () => import("@/components/effects/cart-effects").then((module) => module.CartEffects),
  { ssr: false, loading: () => null },
);

export const UrgencyTicker = dynamic(
  () => import("@/components/sections/urgency-ticker").then((module) => module.UrgencyTicker),
  { ssr: false, loading: () => null },
);

export const CompareBarWrapper = dynamic(
  () => import("@/components/product/compare-bar-wrapper").then((module) => module.CompareBarWrapper),
  { ssr: false, loading: () => null },
);

export const StorefrontPromoPopup = dynamic(
  () => import("@/components/promotions/storefront-promo-popup").then((module) => module.StorefrontPromoPopup),
  { ssr: false, loading: () => null },
);
