import { cloudinaryImageUrl } from "@/lib/cloudinary";
import type { HeroSlide } from "@/lib/types";

export const HERO_RESPONSIVE_WIDTHS = [640, 828, 1080, 1200] as const;

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

/** Optimized URL for LCP preload (mobile-first; matches hero `quality={70}`). */
export function heroLcpImageUrl(
  slide: Pick<HeroSlide, "imageUrl" | "subtitle">,
  opts: {
    mobile?: boolean;
    quality?: number | string;
    width?: number;
  } = {},
): string {
  const mobile = opts.mobile !== false;
  const quality = opts.quality ?? 70;
  const width = opts.width ?? (mobile ? 828 : 1200);
  const meta = parseHeroSlideMeta(slide.subtitle);
  const src =
    mobile && meta.mobile?.trim() ? meta.mobile.trim() : slide.imageUrl?.trim();
  if (!src) return "";
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  return cloudinaryImageUrl(src, {
    w: width,
    q: String(quality),
  });
}

/**
 * Matches the responsive candidates used by `next/image` for the hero.
 * Supplying the srcset to the preload lets the browser fetch only the image
 * needed by the current viewport instead of downloading a second LCP asset.
 */
export function heroLcpPreload(
  slide: Pick<HeroSlide, "imageUrl" | "subtitle">,
  opts: { mobile: boolean; quality: number },
): { href: string; imageSrcSet?: string } {
  const href = heroLcpImageUrl(slide, opts);
  if (!href || href.startsWith("/")) return { href };
  return {
    href,
    imageSrcSet: HERO_RESPONSIVE_WIDTHS.map(
      (width) =>
        `${heroLcpImageUrl(slide, { ...opts, width })} ${width}w`,
    ).join(", "),
  };
}
