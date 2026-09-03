import { getServiceClient } from "@/lib/supabase/server";
import {
  normalizePromoCode,
  validatePromoAdminInput,
  type PromoCodeRecord,
  type PromoType,
} from "@/lib/db/promo-rules";

function db() {
  return getServiceClient();
}

export type PromoCodeRow = PromoCodeRecord & {
  id: string;
  usageCount: number;
};

function mapRow(row: Record<string, unknown>): PromoCodeRow {
  return {
    id: String(row.id),
    code: String(row.code ?? ""),
    type: row.type as PromoType,
    value: Number(row.value ?? 0),
    firstOrderOnly: Boolean(row.first_order_only),
    active: Boolean(row.active),
    startsAt: row.starts_at != null ? String(row.starts_at) : null,
    endsAt: row.ends_at != null ? String(row.ends_at) : null,
    usageCount: Number(row.usage_count ?? 0),
  };
}

export async function listPromoCodes(): Promise<PromoCodeRow[]> {
  const { data, error } = await db()
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function getPromoByCode(
  codeRaw: string
): Promise<PromoCodeRow | null> {
  const code = normalizePromoCode(codeRaw);
  if (!code) return null;
  const { data, error } = await db()
    .from("promo_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function createPromoCode(input: Record<string, unknown>): Promise<
  { ok: true; promo: PromoCodeRow } | { ok: false; error: string; status: number }
> {
  const parsed = validatePromoAdminInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };
  const { data, error } = await db()
    .from("promo_codes")
    .insert({
      code: parsed.data.code,
      type: parsed.data.type,
      value: parsed.data.value,
      first_order_only: parsed.data.firstOrderOnly,
      active: parsed.data.active,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That code already exists.", status: 409 };
    }
    console.error("[promo] create", error.message);
    return { ok: false, error: "Failed to create code.", status: 500 };
  }
  return { ok: true, promo: mapRow(data as Record<string, unknown>) };
}

export async function updatePromoCode(
  id: string,
  input: Record<string, unknown>
): Promise<
  { ok: true; promo: PromoCodeRow } | { ok: false; error: string; status: number }
> {
  const parsed = validatePromoAdminInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };
  const { data, error } = await db()
    .from("promo_codes")
    .update({
      code: parsed.data.code,
      type: parsed.data.type,
      value: parsed.data.value,
      first_order_only: parsed.data.firstOrderOnly,
      active: parsed.data.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That code already exists.", status: 409 };
    }
    console.error("[promo] update", error.message);
    return { ok: false, error: "Failed to update.", status: 500 };
  }
  if (!data) return { ok: false, error: "Not found.", status: 404 };
  return { ok: true, promo: mapRow(data as Record<string, unknown>) };
}

export async function incrementPromoUsage(code: string): Promise<void> {
  const row = await getPromoByCode(code);
  if (!row) return;
  await db()
    .from("promo_codes")
    .update({ usage_count: row.usageCount + 1, updated_at: new Date().toISOString() })
    .eq("id", row.id);
}

/** Live non-cancelled orders for this email (first-order check). */
export async function countPriorOrdersForEmail(email: string): Promise<number> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 0;
  const { data, error } = await db()
    .from("orders")
    .select("id, customer, status, is_demo")
    .limit(500);
  if (error) throw error;
  return (data ?? []).filter((row) => {
    const c = row.customer as { email?: string } | null;
    const e = (c?.email ?? "").trim().toLowerCase();
    if (e !== normalized) return false;
    if (row.is_demo) return false;
    if (row.status === "cancelled") return false;
    return true;
  }).length;
}

export async function deletePromoCode(
  id: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { error } = await db().from("promo_codes").delete().eq("id", id);
  if (error) {
    console.error("[promo] delete", error.message);
    return { ok: false, error: "Failed to delete code.", status: 500 };
  }
  return { ok: true };
}

