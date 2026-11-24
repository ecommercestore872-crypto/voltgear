"use client";

import dynamic from "next/dynamic";

export const MetaPixelClientOnly = dynamic(
  () =>
    import("@/components/analytics/meta-pixel").then((module) => module.MetaPixel),
  { ssr: false, loading: () => null },
);

export const ClarityClientOnly = dynamic(
  () =>
    import("@/components/analytics/clarity-deferred").then(
      (module) => module.ClarityDeferred,
    ),
  { ssr: false, loading: () => null },
);

export const ScrollToTopClientOnly = dynamic(
  () =>
    import("@/components/ui/scroll-to-top-button").then(
      (module) => module.ScrollToTopButton,
    ),
  { ssr: false, loading: () => null },
);

export const CartDrawerClientOnly = dynamic(
  () =>
    import("@/components/cart/cart-drawer").then((module) => module.CartDrawer),
  { ssr: false, loading: () => null },
);

export const ReviewReminderClientOnly = dynamic(
  () =>
    import("@/components/reviews/review-reminder-popup").then(
      (module) => module.ReviewReminderPopup,
    ),
  { ssr: false, loading: () => null },
);

export const CartEffectsClientOnly = dynamic(
  () =>
    import("@/components/effects/cart-effects").then(
      (module) => module.CartEffects,
    ),
  { ssr: false, loading: () => null },
);

export const UrgencyTickerClientOnly = dynamic(
  () =>
    import("@/components/sections/urgency-ticker").then(
      (module) => module.UrgencyTicker,
    ),
  { ssr: false, loading: () => null },
);

export const CompareBarClientOnly = dynamic(
  () =>
    import("@/components/product/compare-bar-wrapper").then(
      (module) => module.CompareBarWrapper,
    ),
  { ssr: false, loading: () => null },
);
