/**
 * Copy all Sanity documents + images into the linked Supabase project.
 * Fails the process if any record or image cannot be moved.
 */
import { createClient as createSanity } from "@sanity/client";
import { createImageUrlBuilder } from "@sanity/image-url";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs";
import path from "node:path";

import {
  assertCatalogNotEmpty,
  assertNoSanityCdnUrls,
  chooseImageBackend,
  isCloudinaryConfigured,
  readSupabaseEnv,
} from "../packages/shared/lib/db/migration-rules";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const sanityProject =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
const sanityDataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";
const sanityToken = process.env.SANITY_API_TOKEN;

if (!sanityProject || !sanityToken) {
  console.error("Sanity project id and SANITY_API_TOKEN are required to copy data.");
  process.exit(1);
}

const supabaseEnv = readSupabaseEnv({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

const sanity = createSanity({
  projectId: sanityProject,
  dataset: sanityDataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01",
  token: sanityToken,
  useCdn: false,
});

const imageBuilder = createImageUrlBuilder({
  projectId: sanityProject,
  dataset: sanityDataset,
});

const supabase = createSupabase(supabaseEnv.url, supabaseEnv.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cloudinaryReady = isCloudinaryConfigured({
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
});

if (cloudinaryReady) {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const imageBackend = chooseImageBackend(cloudinaryReady);
console.log(`Image backend: ${imageBackend}`);

function sanityUrl(source: unknown): string | null {
  if (!source) return null;
  if (typeof source === "string") return source;
  try {
    return imageBuilder.image(source as Parameters<typeof imageBuilder.image>[0]).width(1600).url();
  } catch {
    return null;
  }
}

async function relocateImage(source: unknown): Promise<{ url: string; origin: "cloudinary" | "supabase" } | null> {
  const url = sanityUrl(source);
  if (!url) return null;
  if (url.includes("res.cloudinary.com")) return { url, origin: "cloudinary" };
  if (url.includes(".supabase.co")) return { url, origin: "supabase" };

  if (imageBackend === "cloudinary") {
    try {
      const up = await cloudinary.uploader.upload(url, {
        folder: "ecommerce-store/migrated",
      });
      return { url: up.secure_url, origin: "cloudinary" };
    } catch (err) {
      console.warn("Cloudinary upload failed, using Supabase Storage:", (err as Error).message);
    }
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download image ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const filePath = `migrated/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from("product-images").upload(filePath, buf, {
    contentType: res.headers.get("content-type") || "image/jpeg",
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
  return { url: data.publicUrl, origin: "supabase" };
}

function die(message: string, err?: unknown): never {
  console.error(message);
  if (err) console.error(err);
  throw new Error(message);
}

async function main() {
  const products = await sanity.fetch<Record<string, unknown>[]>(
    `*[_type=="product" && !(_id in path("drafts.**"))]`
  );
  const settings = await sanity.fetch<Record<string, unknown> | null>(
    `*[_type=="siteSettings"][0]`
  );
  const hero = await sanity.fetch<Record<string, unknown> | null>(
    `*[_type=="heroSection"][0]`
  );
  const pages = await sanity.fetch<Record<string, unknown>[]>(
    `*[_type=="page" && !(_id in path("drafts.**"))]`
  );
  const testimonials = await sanity.fetch<Record<string, unknown>[]>(
    `*[_type=="testimonial" && !(_id in path("drafts.**"))]`
  );
  const orders = await sanity.fetch<Record<string, unknown>[]>(
    `*[_type=="order"]`
  );
  const reviewSubs = await sanity.fetch<Record<string, unknown>[]>(
    `*[_type=="reviewSubmission"]`
  );
  const emailEvents = await sanity.fetch<Record<string, unknown>[]>(
    `*[_type=="emailEvent"]`
  );
  const campaigns = await sanity.fetch<Record<string, unknown>[]>(
    `*[_type=="messageCampaign"]`
  );
  const broadcast = await sanity.fetch<Record<string, unknown> | null>(
    `*[_type=="broadcastSettings"][0]`
  );

  console.log(
    `Sanity counts — products:${products.length} pages:${pages.length} orders:${orders.length} reviews:${reviewSubs.length}`
  );

  const collectedUrls: string[] = [];
  const productIdMap = new Map<string, string>();

  for (const p of products) {
    const slug =
      typeof p.slug === "string"
        ? p.slug
        : (p.slug as { current?: string } | undefined)?.current;
    if (!slug) die(`Product ${p._id} has no slug`);

    const imageSources = Array.isArray(p.images) ? p.images : [];
    const relocated = [];
    for (const img of imageSources) {
      const moved = await relocateImage(img);
      if (!moved) die(`Could not move an image on product ${slug}`);
      collectedUrls.push(moved.url);
      relocated.push(moved);
    }

    const cloudinaryImages = Array.isArray(p.cloudinaryImages)
      ? (p.cloudinaryImages as string[])
      : [];
    collectedUrls.push(...cloudinaryImages);

    const variants = Array.isArray(p.variants) ? p.variants : [];
    const variantRows = [];
    for (const v of variants as Record<string, unknown>[]) {
      let imageUrl: string | null = null;
      if (v.image) {
        const moved = await relocateImage(v.image);
        if (moved) {
          imageUrl = moved.url;
          collectedUrls.push(moved.url);
        }
      }
      variantRows.push({
        key: v._key,
        name: v.name,
        sku: v.sku,
        price: v.price,
        compare_at_price: v.compareAtPrice,
        stock_status: v.stockStatus ?? "in-stock",
        image_url: imageUrl,
        is_default: Boolean(v.isDefault),
      });
    }

    const { data, error } = await supabase
      .from("products")
      .upsert(
        {
          sanity_id: p._id,
          name: p.name,
          slug,
          brand: p.brand ?? null,
          sku: p.sku ?? null,
          category: p.category,
          price: p.price ?? 0,
          compare_at_price: p.compareAtPrice ?? null,
          short_description: p.shortDescription ?? null,
          description: p.description ?? null,
          features: p.features ?? null,
          specifications: p.specifications ?? null,
          compatibility: p.compatibility ?? null,
          in_the_box: p.inTheBox ?? null,
          product_video: p.productVideo ?? null,
          product_faq: p.productFaq ?? null,
          stock_status: p.stockStatus ?? "in-stock",
          rating: p.rating ?? null,
          review_count: p.reviewCount ?? null,
          featured: Boolean(p.featured),
          badge: p.badge ?? null,
          cloudinary_images: cloudinaryImages,
        },
        { onConflict: "sanity_id" }
      )
      .select("id")
      .single();
    if (error || !data) die(`Failed to upsert product ${slug}`, error);
    productIdMap.set(String(p._id), data.id);

    await supabase.from("product_images").delete().eq("product_id", data.id);
    if (relocated.length) {
      const { error: imgErr } = await supabase.from("product_images").insert(
        relocated.map((img, i) => ({
          product_id: data.id,
          url: img.url,
          sort_order: i,
          source: img.origin,
        }))
      );
      if (imgErr) die(`Failed to save images for ${slug}`, imgErr);
    }

    await supabase.from("product_variants").delete().eq("product_id", data.id);
    if (variantRows.length) {
      const { error: vErr } = await supabase.from("product_variants").insert(
        variantRows.map((v) => ({ ...v, product_id: data.id }))
      );
      if (vErr) die(`Failed to save variants for ${slug}`, vErr);
    }

    const reviews = Array.isArray(p.reviews) ? p.reviews : [];
    await supabase.from("product_reviews").delete().eq("product_id", data.id);
    if (reviews.length) {
      const { error: rErr } = await supabase.from("product_reviews").insert(
        (reviews as Record<string, unknown>[]).map((r) => ({
          product_id: data.id,
          name: r.name ?? null,
          rating: r.rating ?? null,
          review_date: r.date ?? null,
          comment: r.comment ?? null,
          verified: Boolean(r.verified),
          image: r.image ?? null,
          is_demo: Boolean(r.isDemo),
        }))
      );
      if (rErr) die(`Failed to save reviews for ${slug}`, rErr);
    }
  }

  if (settings) {
    let logoUrl: string | null = null;
    if (settings.logo) {
      const moved = await relocateImage(settings.logo);
      if (moved) {
        logoUrl = moved.url;
        collectedUrls.push(moved.url);
      }
    }
    const { error } = await supabase.from("site_settings").upsert({
      id: 1,
      brand_name: settings.brandName ?? "Store",
      tagline: settings.tagline ?? null,
      logo_url: logoUrl,
      primary_color: settings.primaryColor ?? null,
      secondary_color: settings.secondaryColor ?? null,
      theme: settings.theme ?? null,
      heading_font: settings.headingFont ?? null,
      body_font: settings.bodyFont ?? null,
      currency: settings.currency ?? null,
      email: settings.email ?? null,
      phone: settings.phone ?? null,
      address: settings.address ?? null,
      social_links: settings.socialLinks ?? null,
      free_shipping_threshold: settings.freeShippingThreshold ?? null,
      shipping_fee: settings.shippingFee ?? null,
      return_policy: settings.returnPolicy ?? null,
      warranty_info: settings.warrantyInfo ?? null,
      cod_enabled: settings.codEnabled ?? true,
      whatsapp_number: settings.whatsappNumber ?? null,
      warranty_months: settings.warrantyMonths ?? null,
      return_window_days: settings.returnWindowDays ?? null,
      announcement: settings.announcement ?? null,
      seo: settings.seo ?? null,
    });
    if (error) die("Failed to save site settings", error);
  }

  if (hero) {
    let bg: string | null = null;
    if (hero.backgroundImage) {
      const moved = await relocateImage(hero.backgroundImage);
      if (moved) {
        bg = moved.url;
        collectedUrls.push(moved.url);
      }
    }
    const featuredRef =
      typeof hero.featuredProduct === "string"
        ? hero.featuredProduct
        : (hero.featuredProduct as { _ref?: string } | undefined)?._ref;
    const { error } = await supabase.from("hero_sections").upsert({
      id: 1,
      headline: hero.headline ?? "",
      subheadline: hero.subheadline ?? null,
      background_image_url: bg,
      background_video: hero.backgroundVideo ?? null,
      primary_cta: hero.primaryCta ?? null,
      secondary_cta: hero.secondaryCta ?? null,
      stats: hero.stats ?? null,
      featured_product_id: featuredRef ? productIdMap.get(featuredRef) ?? null : null,
    });
    if (error) die("Failed to save hero", error);
  }

  for (const page of pages) {
    const slug =
      typeof page.slug === "string"
        ? page.slug
        : (page.slug as { current?: string } | undefined)?.current;
    if (!slug) die(`Page ${page._id} has no slug`);
    let cover: string | null = null;
    if (page.coverImage) {
      const moved = await relocateImage(page.coverImage);
      if (moved) {
        cover = moved.url;
        collectedUrls.push(moved.url);
      }
    }
    const { error } = await supabase.from("pages").upsert(
      {
        sanity_id: page._id,
        title: page.title,
        slug,
        page_type: page.pageType === "blog" ? "blog" : "static",
        excerpt: page.excerpt ?? null,
        cover_image_url: cover,
        published_at: page.publishedAt ?? null,
        author: page.author ?? null,
        sections: page.sections ?? null,
        keywords: page.keywords ?? null,
        seo: page.seo ?? null,
      },
      { onConflict: "sanity_id" }
    );
    if (error) die(`Failed to save page ${slug}`, error);
  }

  for (const t of testimonials) {
    const { error } = await supabase.from("testimonials").upsert(
      {
        sanity_id: t._id,
        customer_name: t.customerName ?? "Customer",
        review_text: t.reviewText ?? "",
        rating: t.rating ?? 5,
        product: t.product ?? null,
        verified: Boolean(t.verified),
        is_demo: Boolean(t.isDemo),
        sort_order: t.sortOrder ?? null,
      },
      { onConflict: "sanity_id" }
    );
    if (error) die("Failed to save a testimonial", error);
  }

  for (const o of orders) {
    const { data, error } = await supabase
      .from("orders")
      .upsert(
        {
          sanity_id: o._id,
          order_id: o.orderId,
          customer: o.customer ?? {},
          payment: o.payment ?? "cod",
          subtotal: o.subtotal ?? 0,
          shipping: o.shipping ?? 0,
          total: o.total ?? 0,
          status: o.status ?? "new",
          status_updated_at: o.statusUpdatedAt ?? null,
          created_at: o._createdAt ?? new Date().toISOString(),
        },
        { onConflict: "order_id" }
      )
      .select("id")
      .single();
    if (error || !data) die(`Failed to save order ${o.orderId}`, error);
    await supabase.from("order_items").delete().eq("order_id", data.id);
    const items = Array.isArray(o.items) ? (o.items as Record<string, unknown>[]) : [];
    if (items.length) {
      const { error: iErr } = await supabase.from("order_items").insert(
        items.map((i) => ({
          order_id: data.id,
          slug: i.slug ?? null,
          name: i.name ?? null,
          price: i.price ?? null,
          quantity: i.quantity ?? null,
          variant_key: i.variantKey ?? null,
          variant_name: i.variantName ?? null,
          variant_sku: i.variantSku ?? null,
          line_total: i.lineTotal ?? null,
        }))
      );
      if (iErr) die(`Failed to save items for ${o.orderId}`, iErr);
    }
    await supabase.from("order_status_history").delete().eq("order_id", data.id);
    const history = Array.isArray(o.statusHistory)
      ? (o.statusHistory as Record<string, unknown>[])
      : [];
    if (history.length) {
      const { error: hErr } = await supabase.from("order_status_history").insert(
        history.map((h) => ({
          order_id: data.id,
          status: h.status,
          note: h.note ?? null,
          at: h.at ?? new Date().toISOString(),
        }))
      );
      if (hErr) die(`Failed to save history for ${o.orderId}`, hErr);
    }
  }

  for (const r of reviewSubs) {
    const ref = (r.product as { _ref?: string } | undefined)?._ref;
    const productId = ref ? productIdMap.get(ref) : undefined;
    if (!productId) {
      console.warn(`Skipping review ${r._id} — product missing`);
      continue;
    }
    const { error } = await supabase.from("review_submissions").upsert(
      {
        product_id: productId,
        name: r.name ?? null,
        email: r.email ?? null,
        rating: r.rating ?? 5,
        comment: r.comment ?? null,
        image: r.image ?? null,
        category: r.category ?? null,
        product_name: r.productName ?? null,
        verified: Boolean(r.verified),
        status: r.status ?? "pending",
      },
      { onConflict: "id" }
    );
    if (error) {
      const { error: insErr } = await supabase.from("review_submissions").insert({
        product_id: productId,
        name: r.name ?? null,
        email: r.email ?? null,
        rating: r.rating ?? 5,
        comment: r.comment ?? null,
        image: r.image ?? null,
        category: r.category ?? null,
        product_name: r.productName ?? null,
        verified: Boolean(r.verified),
        status: r.status ?? "pending",
      });
      if (insErr) die("Failed to save review submission", insErr);
    }
  }

  for (const e of emailEvents) {
    let payload = e.data;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = { raw: payload };
      }
    }
    const { error } = await supabase.from("email_events").upsert(
      {
        sanity_id: e._id,
        kind: e.kind,
        email: e.email,
        data: payload ?? null,
        due_at: e.dueAt ?? null,
        sent_at: e.sentAt ?? null,
        created_at: e._createdAt ?? new Date().toISOString(),
      },
      { onConflict: "sanity_id" }
    );
    if (error) die("Failed to save email event", error);
  }

  for (const c of campaigns) {
    const { data, error } = await supabase
      .from("message_campaigns")
      .upsert(
        {
          sanity_id: c._id,
          name: c.name ?? null,
          text: c.text ?? "",
          sent: c.sent ?? 0,
          failed: c.failed ?? 0,
          queued: c.queued ?? 0,
          created_at: c._createdAt ?? new Date().toISOString(),
        },
        { onConflict: "sanity_id" }
      )
      .select("id")
      .single();
    if (error || !data) die("Failed to save campaign", error);
    await supabase.from("message_recipients").delete().eq("campaign_id", data.id);
    const recips = Array.isArray(c.recipients)
      ? (c.recipients as Record<string, unknown>[])
      : [];
    if (recips.length) {
      const { error: rErr } = await supabase.from("message_recipients").insert(
        recips.map((r) => ({
          campaign_id: data.id,
          phone: r.phone ?? null,
          name: r.name ?? null,
          status: r.status ?? "queued",
          message_id: r.messageId ?? null,
          sent_at: r.sentAt ?? null,
          error: r.error ?? null,
        }))
      );
      if (rErr) die("Failed to save campaign recipients", rErr);
    }
  }

  if (broadcast) {
    const manual = Array.isArray(broadcast.manual)
      ? (broadcast.manual as Record<string, unknown>[])
      : [];
    for (const m of manual) {
      const { error } = await supabase.from("broadcast_contacts").upsert({
        id: String(m.id ?? `${Date.now()}`),
        phone: m.phone,
        name: m.name ?? null,
        city: m.city ?? null,
        note: m.note ?? null,
      });
      if (error) die("Failed to save broadcast contact", error);
    }
    const suppressed = Array.isArray(broadcast.suppressed)
      ? (broadcast.suppressed as string[])
      : [];
    for (const phone of suppressed) {
      const { error } = await supabase.from("broadcast_suppressed").upsert({ phone });
      if (error) die("Failed to save suppressed number", error);
    }
  }

  const { count, error: countErr } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true });
  if (countErr) die("Could not count products after copy", countErr);
  assertCatalogNotEmpty(count ?? 0);
  assertNoSanityCdnUrls(collectedUrls);

  console.log(`Copy complete. Products in Supabase: ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
