import {
  canPublishHome,
  canPublishSlide,
  MAX_HERO_SLIDES,
} from "@/lib/db/hero-slide-rules";
import { revalidateShopMerchandising } from "@/lib/revalidate-storefront";
import { getServiceClient } from "@/lib/supabase/server";

function db() {
  return getServiceClient({ admin: true });
}

export async function getAdminHero() {
  const { data, error } = await db()
    .from("hero_sections")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveAdminHero(draft: Record<string, unknown>) {
  const { error } = await db()
    .from("hero_sections")
    .upsert({ id: 1, draft }, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export async function publishAdminHero(doc: Record<string, unknown>) {
  const backgroundImages = Array.isArray(doc.backgroundImages)
    ? (doc.backgroundImages as string[]).filter(
        (url): url is string => Boolean(url)
      )
    : doc.backgroundImage
      ? [String(doc.backgroundImage)]
      : [];
  const primaryBgImage =
    backgroundImages[0] ??
    (doc.backgroundImage ? String(doc.backgroundImage) : null);

  const payload: Record<string, unknown> = {
    id: 1,
    headline: doc.headline ?? "",
    subheadline: doc.subheadline ?? null,
    background_image_url: primaryBgImage,
    background_images: backgroundImages.length ? backgroundImages : null,
    background_video: doc.backgroundVideo ?? null,
    primary_cta: doc.primaryCta ?? null,
    secondary_cta: doc.secondaryCta ?? null,
    stats: doc.stats ?? null,
    featured_product_id: doc.featuredProductId || null,
    status: "published",
    draft: null,
  };

  let { error } = await db()
    .from("hero_sections")
    .upsert(payload, { onConflict: "id" });
  if (error && error.code === "42703") {
    delete payload.background_images;
    const fallbackRes = await db()
      .from("hero_sections")
      .upsert(payload, { onConflict: "id" });
    error = fallbackRes.error;
  }

  if (error) return { ok: false as const, error: error.message, status: 500 };
  void revalidateShopMerchandising("/");
  return { ok: true as const };
}

export async function unpublishAdminHero() {
  const { error } = await db()
    .from("hero_sections")
    .update({ status: "unpublished" })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  void revalidateShopMerchandising("/");
  return { ok: true as const };
}

export async function discardAdminHeroDraft() {
  const { error } = await db()
    .from("hero_sections")
    .update({ draft: null })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  return { ok: true as const };
}

export type HeroSlideDoc = {
  productId: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  sortOrder?: number;
  isDemo?: boolean;
};

export async function listAdminHeroSlides() {
  const { data, error } = await db()
    .from("hero_slides")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const productIds = Array.from(
    new Set(rows.map((row) => String(row.product_id ?? "")).filter(Boolean))
  );
  const { data: products } = await db()
    .from("products")
    .select("id, name, slug, stock_status")
    .in("id", productIds);
  const byId = new Map(
    (products ?? []).map((product) => [String(product.id), product])
  );

  return rows.map((row) => ({
    ...row,
    products: byId.get(String(row.product_id)) ?? null,
  }));
}

export async function getHomePublishBlockers() {
  const [
    { count: slideCount, error: slideError },
    { count: testimonialCount, error: testimonialError },
  ] = await Promise.all([
    db()
      .from("hero_slides")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    db()
      .from("testimonials")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
  ]);
  if (slideError || testimonialError) {
    return canPublishHome({
      publishedSlideCount: 0,
      publishedTestimonialCount: 0,
    }).blockers;
  }
  return canPublishHome({
    publishedSlideCount: slideCount ?? 0,
    publishedTestimonialCount: testimonialCount ?? 0,
  }).blockers;
}

export async function createAdminHeroSlide(doc: HeroSlideDoc) {
  const check = canPublishSlide({
    imageUrl: doc.imageUrl,
    productId: doc.productId,
  });
  if (!check.ok) {
    return {
      ok: false as const,
      error: check.reason ?? "Invalid slide.",
      status: 400,
    };
  }

  const { data: maxRow } = await db()
    .from("hero_slides")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = doc.sortOrder ?? Number(maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await db()
    .from("hero_slides")
    .insert({
      product_id: doc.productId,
      image_url: doc.imageUrl.trim(),
      title: doc.title?.trim() || null,
      subtitle: doc.subtitle?.trim() || null,
      sort_order: sortOrder,
      status: "draft",
      is_demo: Boolean(doc.isDemo),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) return { ok: false as const, error: error.message, status: 500 };
  void revalidateShopMerchandising("/", "/admin/hero");
  return { ok: true as const, id: data.id as string, slide: data };
}

export async function updateAdminHeroSlide(id: string, doc: HeroSlideDoc) {
  const check = canPublishSlide({
    imageUrl: doc.imageUrl,
    productId: doc.productId,
  });
  if (!check.ok) {
    return {
      ok: false as const,
      error: check.reason ?? "Invalid slide.",
      status: 400,
    };
  }
  const { error } = await db()
    .from("hero_slides")
    .update({
      product_id: doc.productId,
      image_url: doc.imageUrl.trim(),
      title: doc.title?.trim() || null,
      subtitle: doc.subtitle?.trim() || null,
      sort_order: doc.sortOrder ?? 0,
      is_demo: Boolean(doc.isDemo),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  void revalidateShopMerchandising("/", "/admin/hero");
  return { ok: true as const };
}

export async function publishAdminHeroSlide(id: string, doc?: HeroSlideDoc) {
  if (doc) {
    const saved = await updateAdminHeroSlide(id, doc);
    if (!saved.ok) return saved;
  }
  const { data: row, error: readError } = await db()
    .from("hero_slides")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    return { ok: false as const, error: readError.message, status: 500 };
  }
  if (!row) {
    return { ok: false as const, error: "Slide not found.", status: 404 };
  }
  const check = canPublishSlide({
    imageUrl: String(row.image_url ?? ""),
    productId: String(row.product_id ?? ""),
  });
  if (!check.ok) {
    return {
      ok: false as const,
      error: check.reason ?? "Invalid slide.",
      status: 400,
    };
  }

  const { data: published, error } = await db().rpc("admin_publish_hero_slide", {
    p_id: id,
    p_max: MAX_HERO_SLIDES,
  });
  if (error) {
    const isLimit = error.code === "23514";
    return { ok: false as const, error: isLimit ? `At most ${MAX_HERO_SLIDES} published hero slides.` : error.message, status: isLimit ? 400 : 500 };
  }
  if (!published) return { ok: false as const, error: "Slide not found.", status: 404 };
  void revalidateShopMerchandising("/", "/admin/hero");
  return { ok: true as const };
}

export async function unpublishAdminHeroSlide(id: string) {
  const { error } = await db()
    .from("hero_slides")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  void revalidateShopMerchandising("/", "/admin/hero");
  return { ok: true as const };
}

export async function deleteAdminHeroSlide(id: string) {
  const { error } = await db().from("hero_slides").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message, status: 500 };
  void revalidateShopMerchandising("/", "/admin/hero");
  return { ok: true as const };
}

export async function reorderAdminHeroSlides(orderedIds: string[]) {
  if (!Array.isArray(orderedIds) || new Set(orderedIds).size !== orderedIds.length) {
    return { ok: false as const, error: "Slide ids must be a unique list.", status: 400 };
  }
  const { error } = await db().rpc("admin_reorder_hero_slides", { p_ids: orderedIds });
  if (error) return { ok: false as const, error: error.message, status: 400 };
  void revalidateShopMerchandising("/", "/admin/hero");
  return { ok: true as const };
}
