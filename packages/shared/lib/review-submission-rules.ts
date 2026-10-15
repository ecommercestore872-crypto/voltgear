import { normalizeNewsletterEmail } from "@/lib/newsletter-rules";

export type ReviewSubmissionInput = {
  slug?: unknown;
  rating?: unknown;
  name?: unknown;
  email?: unknown;
  comment?: unknown;
  image?: unknown;
  category?: unknown;
  productName?: unknown;
};

export function normalizeReviewImageUrl(
  raw: unknown,
  cloudName: string | undefined,
): string | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;
  if (!cloudName || value.length > 1000) return undefined;
  try {
    const url = new URL(value);
    const prefix = `/${cloudName}/image/upload/`;
    return url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.startsWith(prefix)
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function validateReviewSubmission(
  input: ReviewSubmissionInput,
  cloudName?: string,
):
  | {
      ok: true;
      data: {
        slug: string;
        rating: number;
        name: string;
        email: string;
        comment: string;
        image?: string;
        category?: string;
        productName?: string;
      };
    }
  | { ok: false; error: string } {
  const slug = String(input.slug ?? "").trim();
  const rating = Number(input.rating);
  const name = String(input.name ?? "").trim();
  const comment = String(input.comment ?? "").trim();
  const email = normalizeNewsletterEmail(input.email);
  if (!slug || slug.length > 160) return { ok: false, error: "Missing product." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Please choose a rating between 1 and 5." };
  }
  if (!name || !email.ok || !comment) {
    return { ok: false, error: "A valid name, email and review are required." };
  }
  if (name.length > 120 || comment.length > 3000) {
    return { ok: false, error: "One or more review fields are too long." };
  }
  const suppliedImage = String(input.image ?? "").trim();
  const image = normalizeReviewImageUrl(suppliedImage, cloudName);
  if (suppliedImage && !image) {
    return { ok: false, error: "The review image is not a valid uploaded image." };
  }
  const category = String(input.category ?? "").trim().slice(0, 120) || undefined;
  const productName = String(input.productName ?? "").trim().slice(0, 200) || undefined;
  return {
    ok: true,
    data: {
      slug,
      rating,
      name,
      email: email.email,
      comment,
      ...(image ? { image } : {}),
      ...(category ? { category } : {}),
      ...(productName ? { productName } : {}),
    },
  };
}
