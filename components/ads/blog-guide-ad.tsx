"use client";

import { AdSenseUnit } from "@/components/ads/adsense-unit";

/**
 * One labelled unit after a buying guide. No slot = nothing rendered.
 * Keep Auto ads off in the AdSense dashboard so Google does not inject
 * banners on home, product, or checkout.
 */
export function BlogGuideAd() {
  const slot = process.env.NEXT_PUBLIC_ADSENSE_BLOG_SLOT?.trim();
  if (!slot) return null;

  return <AdSenseUnit slot={slot} format="auto" />;
}
