const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PublicReviewInput = {
  slug?: unknown;
  rating?: unknown;
  name?: unknown;
  email?: unknown;
  comment?: unknown;
  image?: unknown;
};

export function normalizePublicReview(
  input: PublicReviewInput,
  cloudName?: string,
):
  | {
      ok: true;
      value: {
        slug: string;
        rating: number;
        name: string;
        email: string;
        comment: string;
        image?: string;
      };
    }
  | { ok: false; error: string } {
  const slug = String(input.slug ?? "").trim().toLowerCase();
  const rating = Number(input.rating);
  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
  const comment = String(input.comment ?? "").trim();
  const image = String(input.image ?? "").trim();

  if (!SLUG_PATTERN.test(slug) || slug.length > 160) {
    return { ok: false, error: "Please choose a valid product." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Please choose a rating between 1 and 5." };
  }
  if (!name || name.length > 100) {
    return { ok: false, error: "Please enter a name under 100 characters." };
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!comment || comment.length > 2_000) {
    return { ok: false, error: "Review text must be between 1 and 2,000 characters." };
  }

  if (image) {
    if (!cloudName) {
      return { ok: false, error: "Review photo uploads are unavailable." };
    }
    let url: URL;
    try {
      url = new URL(image);
    } catch {
      return { ok: false, error: "Review photo URL is invalid." };
    }
    const expectedPath = `/${cloudName}/image/upload/`;
    if (
      url.protocol !== "https:" ||
      url.hostname !== "res.cloudinary.com" ||
      !url.pathname.startsWith(expectedPath) ||
      !url.pathname.includes("/ecommerce-store/reviews/")
    ) {
      return { ok: false, error: "Review photo must come from the review uploader." };
    }
  }

  return {
    ok: true,
    value: {
      slug,
      rating,
      name,
      email,
      comment,
      ...(image ? { image } : {}),
    },
  };
}
