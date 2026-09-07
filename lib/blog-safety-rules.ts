/**
 * Blog safety for accessibility, XSS, performance, and AdSense inventory.
 *
 * @see https://support.google.com/adsense/answer/10502938 (valuable inventory)
 * @see https://support.google.com/adsense/answer/48182 (program policies / ad labels)
 * @see https://support.google.com/adsense/answer/1282097 (placement near content)
 * @see https://www.w3.org/WAI/WCAG22/quickref/ (alt text, contrast, names)
 */

import type { ContentBlock } from "@/lib/types";

/** Reserved space under a guide so the ad label + unit do not shove content (CLS). */
export const BLOG_AD_MIN_HEIGHT_PX = 120;

const MAX_SECTIONS = 60;
const MAX_TEXT = 8_000;
const MAX_LIST_ITEMS = 40;

export function stripHtmlNoise(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Only same-site paths or https URLs. Blocks javascript:/data:/protocol-relative.
 */
export function safeBlogHref(raw?: string | null): string | null {
  const href = (raw ?? "").trim();
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) {
    if (href.includes("\\") || href.includes("\0")) return null;
    return href.slice(0, 500);
  }
  try {
    const url = new URL(href);
    if (url.protocol !== "https:") return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

function clipText(raw: unknown, max = MAX_TEXT): string {
  return stripHtmlNoise(String(raw ?? "")).slice(0, max);
}

/**
 * Public blog bodies must stay plain, link-safe, and free of heavy/policy-risky blocks.
 * contactForm + relatedProducts are dropped: forms/product grids next to ads hurt
 * UX, Core Web Vitals, and AdSense placement clarity.
 */
export function sanitizeBlogSections(blocks: ContentBlock[] | undefined): ContentBlock[] {
  if (!Array.isArray(blocks)) return [];
  const out: ContentBlock[] = [];
  for (const block of blocks.slice(0, MAX_SECTIONS)) {
    if (!block || typeof block !== "object" || !("_type" in block)) continue;
    switch (block._type) {
      case "heading":
        out.push({
          _type: "heading",
          level: block.level === "h3" || block.level === "h4" ? block.level : "h2",
          text: clipText(block.text, 200),
        });
        break;
      case "paragraph":
        out.push({ _type: "paragraph", text: clipText(block.text) });
        break;
      case "list":
        out.push({
          _type: "list",
          type: block.type === "number" ? "number" : "bullet",
          items: (block.items ?? [])
            .slice(0, MAX_LIST_ITEMS)
            .map((item) => clipText(item, 500))
            .filter(Boolean),
        });
        break;
      case "callout":
        out.push({
          _type: "callout",
          title: clipText(block.title, 120),
          text: clipText(block.text, 2_000),
        });
        break;
      case "quote":
        out.push({ _type: "quote", text: clipText(block.text, 2_000) });
        break;
      case "faq":
        out.push({
          _type: "faq",
          items: (block.items ?? [])
            .slice(0, 20)
            .map((item) => ({
              question: clipText(item.question, 300),
              answer: clipText(item.answer, 2_000),
            }))
            .filter((item) => item.question && item.answer),
        });
        break;
      case "cta": {
        const href = safeBlogHref(block.href);
        const label = clipText(block.label, 80);
        if (href && label) out.push({ _type: "cta", label, href });
        break;
      }
      case "inlineImage": {
        const image = typeof block.image === "string" ? block.image.trim() : "";
        if (!image || image.startsWith("javascript:") || image.startsWith("data:")) break;
        out.push({
          _type: "inlineImage",
          image,
          dimensions: block.dimensions,
        });
        break;
      }
      case "contactForm":
      case "relatedProducts":
        break;
      default:
        break;
    }
  }
  return out;
}

export type BlogInventoryInput = {
  title?: string;
  excerpt?: string;
  coverImage?: string;
  sections?: ContentBlock[];
};

/**
 * AdSense wants original, useful pages — not thin stubs with a display unit.
 */
export function blogInventoryReadyForAds(
  doc: BlogInventoryInput
): { ok: true } | { ok: false; error: string } {
  if (!(doc.title ?? "").trim()) return { ok: false, error: "Title is required." };
  if ((doc.excerpt ?? "").trim().length < 40) {
    return { ok: false, error: "Write a real excerpt so the page is useful inventory." };
  }
  if (!(doc.coverImage ?? "").trim()) {
    return { ok: false, error: "Add a cover image before running ads on the guide." };
  }
  const sections = sanitizeBlogSections(doc.sections);
  if (sections.length < 4) {
    return { ok: false, error: "Add at least four body sections before showing ads." };
  }
  const textBlocks = sections.filter((b) =>
    b._type === "paragraph" || b._type === "list" || b._type === "callout" || b._type === "faq"
  );
  if (textBlocks.length < 2) {
    return { ok: false, error: "The guide needs real reading content, not headings alone." };
  }
  return { ok: true };
}
