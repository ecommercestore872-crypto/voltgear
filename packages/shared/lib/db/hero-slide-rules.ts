export const MAX_HERO_SLIDES = 8;

export function canPublishSlide(slide: {
  imageUrl?: string | null;
  productId?: string | null;
}): { ok: boolean; reason?: string } {
  const imageUrl = (slide.imageUrl ?? "").trim();
  const productId = (slide.productId ?? "").trim();
  if (!imageUrl) return { ok: false, reason: "Image is required." };
  if (!productId) return { ok: false, reason: "Product is required." };
  return { ok: true };
}

export function canPublishHome(input: {
  publishedSlideCount: number;
  publishedTestimonialCount: number;
}): { ok: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (input.publishedSlideCount < 1) {
    blockers.push("Add at least one published hero slide.");
  }
  if (input.publishedTestimonialCount < 1) {
    blockers.push("Add at least one published testimonial.");
  }
  return { ok: blockers.length === 0, blockers };
}

export function resolveSlideCta(stockStatus: string | null | undefined): {
  label: string;
  disabled: boolean;
} {
  if (stockStatus === "out-of-stock") {
    return { label: "Out of stock", disabled: true };
  }
  return { label: "Shop now", disabled: false };
}
