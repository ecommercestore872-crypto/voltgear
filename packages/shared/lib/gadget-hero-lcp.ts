import { cloudinaryImageUrl } from "@/lib/cloudinary";
import type { HeroSlide } from "@/lib/types";

export function parseHeroSlideMeta(subtitle?: string | null): {
  text?: string;
  mobile?: string;
} {
  if (!subtitle?.trim().startsWith("{")) return { text: subtitle ?? undefined };
  try {
    const parsed = JSON.parse(subtitle) as {
      text?: string;
      mobile?: string;
    };
    return { text: parsed.text, mobile: parsed.mobile };
  } catch {
    return { text: subtitle ?? undefined };
  }
}

/** Optimized URL for LCP preload (mobile-first). */
export function heroLcpImageUrl(
  slide: Pick<HeroSlide, "imageUrl" | "subtitle">,
  opts: { mobile?: boolean } = {},
): string {
  const mobile = opts.mobile !== false;
  const meta = parseHeroSlideMeta(slide.subtitle);
  const src =
    mobile && meta.mobile?.trim() ? meta.mobile.trim() : slide.imageUrl?.trim();
  if (!src) return "";
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  return cloudinaryImageUrl(src, { w: mobile ? 828 : 1280, q: "auto" });
}
