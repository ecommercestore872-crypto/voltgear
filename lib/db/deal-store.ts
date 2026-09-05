import { getServiceClient } from "@/lib/supabase/server";
import { getAdminSettings, getAnalyticsAdSpend, fetchProductCoachCatalog } from "@/lib/db/admin-store";
import {
  parseDealList,
  validateDealAdminInput,
  type DealCatalogProduct,
  type DealFloorInput,
  type DealRecord,
} from "@/lib/db/deal-rules";

function db() {
  return getServiceClient();
}

function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  const message = error?.message ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /could not find the table|schema cache/i.test(message)
  );
}

function mapRow(row: Record<string, unknown>): DealRecord {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    slugA: String(row.slug_a ?? row.slugA ?? ""),
    slugB: String(row.slug_b ?? row.slugB ?? ""),
    percentOff: Number(row.percent_off ?? row.percentOff ?? 0),
    active: row.active !== false,
  };
}

async function dealsFromDraft(): Promise<DealRecord[]> {
  const settings = await getAdminSettings().catch(() => null);
  const draft =
    settings?.draft && typeof settings.draft === "object"
      ? (settings.draft as Record<string, unknown>)
      : null;
  return parseDealList(draft?.productDeals);
}

async function saveDealsToDraft(deals: DealRecord[]): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const current = await getAdminSettings();
  const draft =
    current?.draft && typeof current.draft === "object"
      ? { ...(current.draft as Record<string, unknown>), productDeals: deals }
      : { productDeals: deals };
  const { error } = await db().from("site_settings").upsert({ id: 1, draft }, { onConflict: "id" });
  if (error) return { ok: false, error: error.message, status: 500 };
  return { ok: true };
}

export async function listProductDeals(): Promise<DealRecord[]> {
  const { data, error } = await db()
    .from("product_deals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!error) return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  if (isMissingTable(error)) return dealsFromDraft();
  throw error;
}

export async function fetchDealCatalog(): Promise<DealCatalogProduct[]> {
  const products = await fetchProductCoachCatalog();
  const ids = products.map((p) => p.slug);
  const images = new Map<string, string>();
  if (ids.length) {
    const { data } = await db()
      .from("products")
      .select("slug, product_images(url, sort_order)")
      .in("slug", ids);
    for (const row of data ?? []) {
      const slug = String((row as { slug?: string }).slug ?? "");
      const imgs = Array.isArray((row as { product_images?: { url?: string; sort_order?: number }[] }).product_images)
        ? [...((row as { product_images: { url?: string; sort_order?: number }[] }).product_images)].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
          )
        : [];
      const url = imgs.find((img) => img.url)?.url;
      if (slug && url) images.set(slug, String(url));
    }
  }
  return products.map((p) => ({ ...p, imageUrl: images.get(p.slug) ?? null }));
}

export async function loadDealFloorExtras(): Promise<Omit<DealFloorInput, "priceA" | "priceB" | "costA" | "costB">> {
  const [settings, spend] = await Promise.all([
    getAdminSettings().catch(() => null),
    getAnalyticsAdSpend().catch(() => ({ ranges: {}, packingFee: 0, codFee: 0 })),
  ]);
  const shippingFee =
    settings && typeof settings === "object" && "shipping_fee" in settings
      ? Number((settings as { shipping_fee?: unknown }).shipping_fee) || 0
      : 0;
  return {
    shippingFee,
    packingFee: spend.packingFee ?? 0,
    codFee: spend.codFee ?? 0,
    deliveryRate: 1,
    rtoRate: 0,
  };
}

export async function createProductDeal(raw: unknown): Promise<
  { ok: true; deal: DealRecord } | { ok: false; error: string; status: number }
> {
  const [catalog, existing, extras] = await Promise.all([
    fetchDealCatalog(),
    listProductDeals(),
    loadDealFloorExtras(),
  ]);
  const parsed = validateDealAdminInput(raw, catalog, existing, extras);
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };

  const insert = {
    title: parsed.data.title,
    slug_a: parsed.data.slugA,
    slug_b: parsed.data.slugB,
    percent_off: parsed.data.percentOff,
    active: parsed.data.active,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db().from("product_deals").insert(insert).select("*").single();
  if (!error && data) return { ok: true, deal: mapRow(data as Record<string, unknown>) };
  if (error && !isMissingTable(error)) {
    return { ok: false, error: "Could not save the deal.", status: 500 };
  }

  const deal: DealRecord = {
    id: crypto.randomUUID(),
    title: parsed.data.title,
    slugA: parsed.data.slugA,
    slugB: parsed.data.slugB,
    percentOff: parsed.data.percentOff,
    active: parsed.data.active,
  };
  const saved = await saveDealsToDraft([deal, ...existing]);
  if (!saved.ok) return saved;
  return { ok: true, deal };
}

export async function updateProductDeal(
  id: string,
  raw: unknown
): Promise<{ ok: true; deal: DealRecord } | { ok: false; error: string; status: number }> {
  const [catalog, existing, extras] = await Promise.all([
    fetchDealCatalog(),
    listProductDeals(),
    loadDealFloorExtras(),
  ]);
  const parsed = validateDealAdminInput(raw, catalog, existing, extras, id);
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };

  const patch = {
    title: parsed.data.title,
    slug_a: parsed.data.slugA,
    slug_b: parsed.data.slugB,
    percent_off: parsed.data.percentOff,
    active: parsed.data.active,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db().from("product_deals").update(patch).eq("id", id).select("*").maybeSingle();
  if (!error && data) return { ok: true, deal: mapRow(data as Record<string, unknown>) };
  if (error && !isMissingTable(error)) {
    return { ok: false, error: "Could not update the deal.", status: 500 };
  }

  const current = existing.find((d) => d.id === id);
  if (!current) return { ok: false, error: "Deal not found.", status: 404 };
  const deal: DealRecord = {
    id,
    title: parsed.data.title,
    slugA: parsed.data.slugA,
    slugB: parsed.data.slugB,
    percentOff: parsed.data.percentOff,
    active: parsed.data.active,
  };
  const saved = await saveDealsToDraft(existing.map((row) => (row.id === id ? deal : row)));
  if (!saved.ok) return saved;
  return { ok: true, deal };
}

export async function deleteProductDeal(
  id: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { error } = await db().from("product_deals").delete().eq("id", id);
  if (!error) return { ok: true };
  if (!isMissingTable(error)) return { ok: false, error: "Could not delete the deal.", status: 500 };
  const existing = await dealsFromDraft();
  const saved = await saveDealsToDraft(existing.filter((row) => row.id !== id));
  if (!saved.ok) return saved;
  return { ok: true };
}
