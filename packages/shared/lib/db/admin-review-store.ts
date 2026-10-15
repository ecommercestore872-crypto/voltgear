import { revalidateTag } from "next/cache";

import {
  revalidateAfterPublish,
  revalidateShopMerchandising,
} from "@/lib/revalidate-storefront";
import { STOREFRONT_CATALOG_GRID_CACHE_TAG } from "@/lib/storefront-cache";
import { getServiceClient } from "@/lib/supabase/server";

function db() {
  return getServiceClient({ admin: true });
}

type TestimonialDoc = {
  customerName: string;
  reviewText: string;
  rating: number;
  product?: string;
  verified?: boolean;
  isDemo?: boolean;
};

function validateTestimonial(doc: TestimonialDoc | null | undefined) {
  const customerName = typeof doc?.customerName === "string" ? doc.customerName.trim() : "";
  const reviewText = typeof doc?.reviewText === "string" ? doc.reviewText.trim() : "";
  const product = typeof doc?.product === "string" ? doc.product.trim() : "";
  const rating = Number(doc?.rating);
  if (!customerName || !reviewText) return { ok: false as const, error: "Name and review text are required.", status: 400 };
  if (customerName.length > 120 || reviewText.length > 2000 || product.length > 160) {
    return { ok: false as const, error: "One or more testimonial fields are too long.", status: 400 };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false as const, error: "Rating must be a whole number from 1 to 5.", status: 400 };
  }
  return { ok: true as const, data: { customerName, reviewText, product, rating } };
}

export async function listAdminTestimonials() {
  const { data, error } = await db()
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAdminTestimonial(id: string) {
  const { data, error } = await db().from("testimonials").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAdminTestimonial(doc: TestimonialDoc) {
  const validation = validateTestimonial(doc);
  if (!validation.ok) return validation;
  const { data, error } = await db()
    .from("testimonials")
    .insert({
      customer_name: validation.data.customerName,
      review_text: validation.data.reviewText,
      rating: validation.data.rating,
      status: "draft",
      draft: doc,
      is_demo: Boolean(doc.isDemo),
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const, id: String(data.id) };
}

export async function saveAdminTestimonial(id: string, doc: TestimonialDoc) {
  const validation = validateTestimonial(doc);
  if (!validation.ok) return validation;
  const { data, error } = await db()
    .from("testimonials")
    .update({ draft: doc, is_demo: Boolean(doc.isDemo) })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message, status: 500 };
  if (!data) return { ok: false as const, error: "Testimonial not found.", status: 404 };
  return { ok: true as const };
}
export async function publishAdminTestimonial(id: string, doc: TestimonialDoc) {
  const validation = validateTestimonial(doc);
  if (!validation.ok) return validation;
  const { data, error } = await db()
    .from("testimonials")
    .update({
      customer_name: validation.data.customerName,
      review_text: validation.data.reviewText,
      rating: validation.data.rating,
      product: validation.data.product || null,
      verified: Boolean(doc.verified),
      is_demo: Boolean(doc.isDemo),
      status: "published",
      draft: null,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message, status: 500 };
  if (!data) return { ok: false as const, error: "Testimonial not found.", status: 404 };
  void revalidateShopMerchandising("/");
  return { ok: true as const };
}

export async function unpublishAdminTestimonial(id: string) {
  const { data, error } = await db().from("testimonials").update({ status: "unpublished" }).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false as const, error: error.message, status: 500 };
  if (!data) return { ok: false as const, error: "Testimonial not found.", status: 404 };
  void revalidateShopMerchandising("/");
  return { ok: true as const };
}

export async function discardAdminTestimonialDraft(id: string) {
  const { error } = await db().from("testimonials").update({ draft: null }).eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function deleteAdminTestimonial(id: string) {
  const { data, error } = await db().from("testimonials").delete().eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false as const, error: error.message, status: 500 };
  if (!data) return { ok: false as const, error: "Testimonial not found.", status: 404 };
  void revalidateShopMerchandising("/");
  return { ok: true as const };
}

export async function listReviewSubmissions(limit = 500) {
  const { data, error } = await db()
    .from("review_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 2000)));
  if (error) throw error;
  return data ?? [];
}

/** Dashboard + queue — pending only, bounded. */
export async function listPendingReviewSubmissions(limit = 150) {
  const { data, error } = await db()
    .from("review_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 500)));
  if (error) throw error;
  return data ?? [];
}

export async function moderateReview(id: string, action: "approve" | "reject", reply?: string) {
  const { data, error } = await db().rpc("admin_moderate_review", {
    p_submission_id: id,
    p_action: action,
    p_reply: reply?.trim().slice(0, 1000) || null,
  });
  if (error || !data?.ok) {
    const business = error?.message?.split("BUSINESS_ERROR:")[1]?.trim();
    return {
      ok: false as const,
      error: business || "Could not moderate that review.",
      status: business && /not found/i.test(business) ? 404 : 503,
    };
  }
  const productId = String(data.product_id ?? "");
  const slug = String(data.product_slug ?? "");
  if (productId) revalidateTag(`product-reviews-${productId}`, "max");
  revalidateTag(STOREFRONT_CATALOG_GRID_CACHE_TAG, "max");
  void revalidateAfterPublish(slug ? `/product/${slug}` : "/products", "/products");
  return { ok: true as const };
}

export async function deleteReview(id: string) {
  const { data, error } = await db().rpc("admin_delete_review", {
    p_submission_id: id,
  });
  if (error || !data?.ok) {
    const business = error?.message?.split("BUSINESS_ERROR:")[1]?.trim();
    return {
      ok: false as const,
      error: business || "Could not delete that review.",
      status: business && /not found/i.test(business) ? 404 : 503,
    };
  }
  const productId = String(data.product_id ?? "");
  const slug = String(data.product_slug ?? "");
  if (productId) revalidateTag(`product-reviews-${productId}`, "max");
  revalidateTag(STOREFRONT_CATALOG_GRID_CACHE_TAG, "max");
  void revalidateAfterPublish(slug ? `/product/${slug}` : "/products", "/products");
  return { ok: true as const };
}

