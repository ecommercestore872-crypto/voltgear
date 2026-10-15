import { formatOrderId, nextSequentialNumber } from "@/lib/db/order-id";
import type { OrderAttributionSnapshot } from "@/lib/db/order-attribution-rules";
import { getServiceClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/messaging";
import type {
  Order,
  OrderCustomer,
  OrderItem,
  OrderStatus,
} from "@/lib/types";

function db() {
  return getServiceClient();
}

export async function allocatePublicOrderId(): Promise<string> {
  const { data, error } = await db().rpc("next_order_public_number");
  if (!error && data != null) {
    const n = Number(data);
    if (Number.isInteger(n) && n >= 1) return formatOrderId(n);
  }
  const { data: rows } = await db().from("orders").select("order_id");
  const ids = (rows ?? []).map((row) => String(row.order_id ?? ""));
  return formatOrderId(nextSequentialNumber(ids));
}

function mapOrder(row: Record<string, unknown>, items: OrderItem[], history: Order["statusHistory"]): Order {
  return {
    _id: String(row.id),
    orderId: String(row.order_id),
    customer: (row.customer as OrderCustomer) ?? {},
    items,
    payment: row.payment ? String(row.payment) : "cod",
    subtotal: Number(row.subtotal ?? 0),
    shipping: Number(row.shipping ?? 0),
    discount: Number(row.discount ?? 0) || undefined,
    promoCode: row.promo_code ? String(row.promo_code) : null,
    total: Number(row.total ?? 0),
    status: (row.status as OrderStatus) ?? "new",
    statusUpdatedAt: row.status_updated_at ? String(row.status_updated_at) : undefined,
    statusHistory: history,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    isDemo: Boolean(row.is_demo),
    postexTrackingNumber: row.postex_tracking_number
      ? String(row.postex_tracking_number)
      : undefined,
  };
}

async function loadOrderBundle(row: Record<string, unknown>): Promise<Order> {
  const id = String(row.id);
  let items = row.order_items as Record<string, unknown>[] | undefined;
  let history = row.order_status_history as Record<string, unknown>[] | undefined;

  if (!items || !history) {
    const [{ data: fetchedItems }, { data: fetchedHistory }] = await Promise.all([
      db().from("order_items").select("*").eq("order_id", id),
      db().from("order_status_history").select("*").eq("order_id", id).order("at", { ascending: true }),
    ]);
    items = fetchedItems as Record<string, unknown>[] ?? [];
    history = fetchedHistory as Record<string, unknown>[] ?? [];
  } else {
    // Ensure chronological history if eager-loaded
    history.sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
  }

  return mapOrder(
    row,
    (items ?? []).map((i) => ({
      slug: i.slug ? String(i.slug) : undefined,
      name: i.name ? String(i.name) : undefined,
      price: i.price != null ? Number(i.price) : undefined,
      quantity: i.quantity != null ? Number(i.quantity) : undefined,
      variantKey: i.variant_key ? String(i.variant_key) : undefined,
      variantName: i.variant_name ? String(i.variant_name) : undefined,
      variantSku: i.variant_sku ? String(i.variant_sku) : undefined,
      lineTotal: i.line_total != null ? Number(i.line_total) : undefined,
    })),
    (history ?? []).map((h) => ({
      status: h.status as OrderStatus,
      note: h.note ? String(h.note) : undefined,
      at: h.at ? String(h.at) : undefined,
    }))
  );
}

export async function createOrderRow(input: {
  orderId: string;
  customer: OrderCustomer;
  items: OrderItem[];
  payment: string;
  subtotal: number;
  shipping: number;
  total: number;
  discount?: number;
  promoCode?: string | null;
  isDemo?: boolean;
  idempotencyKey?: string | null;
  idempotencyFingerprint?: string | null;
}): Promise<{ orderId: string; replayed: boolean } | null> {
  const rpcItems = input.items.map((i) => ({
    slug: i.slug,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    variantKey: i.variantKey,
    variantName: i.variantName,
    variantSku: i.variantSku,
    lineTotal: i.lineTotal,
  }));

  const rpcArgs = {
    p_order_id: input.orderId,
    p_customer: input.customer,
    p_payment: input.payment,
    p_subtotal: input.subtotal,
    p_shipping: input.shipping,
    p_total: input.total,
    p_discount: input.discount ?? 0,
    p_promo_code: input.promoCode ?? "",
    p_is_demo: Boolean(input.isDemo),
    p_items: rpcItems,
    p_idempotency_key: input.idempotencyKey || null,
    p_idempotency_fingerprint: input.idempotencyFingerprint || null,
  };

  const rpcName = input.isDemo
    ? "checkout_place_demo_order"
    : "checkout_place_order";
  const { data: rpcData, error: rpcError } = await db().rpc(
    rpcName,
    rpcArgs,
  );

  if (!rpcError && rpcData?.ok) {
    return {
      orderId: rpcData.order_id || input.orderId,
      replayed: Boolean(rpcData.replayed)
    };
  }

  if (rpcError?.message?.includes("BUSINESS_ERROR:")) {
    throw new Error(
      `ATOMIC_BUSINESS_ERROR:${rpcError.message.split("BUSINESS_ERROR:")[1].trim()}`
    );
  }

  console.error(`[order] ${rpcName} failed or missing:`, rpcError);
  throw new Error("ATOMIC_INFRA_ERROR");
}

function atomicBusinessError(message: string | undefined): string | null {
  const marker = "BUSINESS_ERROR:";
  const index = message?.indexOf(marker) ?? -1;
  return index >= 0 ? message!.slice(index + marker.length).trim() : null;
}

export async function cancelOrderRestoreInventoryRow(
  orderId: string,
  note: string,
): Promise<{ ok: true } | { ok: false; error: string; status: 404 | 409 | 503 }> {
  const { data, error } = await db().rpc("cancel_order_restore_inventory", {
    p_order_id: orderId.trim(),
    p_note: note.trim().slice(0, 500),
  });
  if (!error && data?.ok) return { ok: true };

  const businessError = atomicBusinessError(error?.message);
  if (businessError) {
    return {
      ok: false,
      error: businessError,
      status: /not found/i.test(businessError) ? 404 : 409,
    };
  }
  console.error("[order] cancel_order_restore_inventory failed:", error);
  return {
    ok: false,
    error: "Cancellation failed due to a system error.",
    status: 503,
  };
}

export async function updateOrderAttributionRow(
  orderId: string,
  attrib: OrderAttributionSnapshot
): Promise<void> {
  try {
    const { error } = await db()
      .from("orders")
      .update({
        attrib_source: attrib.attrib_source,
        attrib_medium: attrib.attrib_medium,
        attrib_campaign: attrib.attrib_campaign,
        attrib_campaign_id: attrib.attrib_campaign_id,
        attrib_ttclid: attrib.attrib_ttclid,
        attrib_fbclid: attrib.attrib_fbclid,
        attrib_gclid: attrib.attrib_gclid,
      })
      .eq("order_id", orderId);
    if (error) {
      console.error("[order-attribution]", "update failed");
    }
  } catch {
    console.error("[order-attribution]", "update failed");
  }
}

/** In-flight PostEx shipments — status synced by cron / track lookup. */
export async function listOrderIdsForPostExSync(limit = 40): Promise<string[]> {
  const { data, error } = await db()
    .from("orders")
    .select("order_id")
    .not("postex_tracking_number", "is", null)
    .in("status", ["processing", "shipped"])
    .order("status_updated_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[orders] postex sync list failed:", error);
    return [];
  }
  return (data ?? [])
    .map((row) => String((row as { order_id?: string }).order_id ?? "").trim())
    .filter(Boolean);
}

export async function getOrderByPublicId(orderId: string): Promise<Order | null> {
  const { data, error } = await db()
    .from("orders")
    .select("*, order_items(*), order_status_history(*)")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return loadOrderBundle(data as Record<string, unknown>);
}

export async function getOrdersByEmail(
  email: string,
  options?: { demo?: boolean },
): Promise<Order[]> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return [];
  const { data, error } = await db()
    .from("orders")
    .select("*, order_items(*), order_status_history(*)")
    .eq("customer->>email", normalized)
    .eq("is_demo", options?.demo === true)
    .order("created_at", { ascending: false });
  if (error) return [];
  return Promise.all((data ?? []).map((row) => loadOrderBundle(row as Record<string, unknown>)));
}

export async function getOrdersByPhone(
  phone: string,
  options?: { demo?: boolean },
): Promise<Order[]> {
  const normalized = normalizePhone(phone) ?? phone.trim();
  if (!normalized) return [];
  const local = normalized.startsWith("+92") ? `0${normalized.slice(3)}` : normalized;
  const digits = normalized.replace(/\D/g, "");
  const candidates = Array.from(new Set([phone.trim(), normalized, local, digits]));
  const { data, error } = await db()
    .from("orders")
    .select("*, order_items(*), order_status_history(*)")
    .in("customer->>phone", candidates)
    .eq("is_demo", options?.demo === true)
    .order("created_at", { ascending: false });
  if (error) return [];
  return Promise.all((data ?? []).map((row) => loadOrderBundle(row as Record<string, unknown>)));
}

const DEAL_SUGGESTION_ORDER_LIMIT = 1000;

function mapDeliveredOrderRowForDealSuggestions(row: Record<string, unknown>) {
  const items = row.order_items as Record<string, unknown>[] | undefined;
  return {
    status: row.status != null ? String(row.status) : undefined,
    isDemo: row.is_demo === true,
    items: (items ?? []).map((i) => ({
      slug: i.slug ? String(i.slug) : undefined,
      quantity: i.quantity != null ? Number(i.quantity) : undefined,
    })),
  };
}

/** Delivered orders with line item slugs only — deal pair suggestions (no history, sync map). */
export async function listDeliveredOrdersForDealSuggestions() {
  const { data, error } = await db()
    .from("orders")
    .select("status, is_demo, order_items(slug, quantity)")
    .eq("status", "delivered")
    .eq("is_demo", false)
    .order("created_at", { ascending: false })
    .limit(DEAL_SUGGESTION_ORDER_LIMIT);
  if (error) return [];
  return (data ?? []).map((row) =>
    mapDeliveredOrderRowForDealSuggestions(row as Record<string, unknown>),
  );
}

/** @deprecated Prefer listDeliveredOrdersForDealSuggestions — lighter payload. */
export async function getDeliveredOrdersWithItemsForDeals(): Promise<Order[]> {
  const { data, error } = await db()
    .from("orders")
    .select(
      "id, order_id, status, is_demo, created_at, customer, order_items(slug, name, price, quantity, line_total, variant_name, variant_key, variant_sku)",
    )
    .eq("status", "delivered")
    .eq("is_demo", false)
    .order("created_at", { ascending: false })
    .limit(DEAL_SUGGESTION_ORDER_LIMIT);
  if (error) return [];
  return Promise.all(
    (data ?? []).map((row) => loadOrderBundle(row as Record<string, unknown>)),
  );
}

export async function getAllOrders(): Promise<Order[]> {
  const { data, error } = await db()
    .from("orders")
    .select("*, order_items(*), order_status_history(*)")
    .order("created_at", { ascending: false });
  if (error) return [];
  return Promise.all((data ?? []).map((row) => loadOrderBundle(row as Record<string, unknown>)));
}

/** @deprecated Unbounded — use listAdminOrdersPage, listWinbackCandidates, or SQL rollups. */
export async function getLightweightOrders(): Promise<Order[]> {
  const { data, error } = await db()
    .from("orders")
    .select("order_id, created_at, status, status_updated_at, total, is_demo, customer")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return [];
  return (data ?? []).map((row) => ({
    orderId: row.order_id,
    createdAt: row.created_at,
    status: row.status as OrderStatus,
    statusUpdatedAt: row.status_updated_at,
    total: row.total,
    isDemo: row.is_demo,
    customer: typeof row.customer === "string" ? JSON.parse(row.customer) : row.customer,
  } as Order));
}

export async function appendOrderHistoryNote(
  orderId: string,
  note: string
): Promise<void> {
  const current = await getOrderByPublicId(orderId);
  if (!current || !note.trim()) return;
  const { error } = await db().from("order_status_history").insert({
    order_id: current._id,
    status: current.status ?? "new",
    note: note.trim(),
    at: new Date().toISOString(),
  });
  if (error) {
    console.error("[orders] email note failed:", error);
  }
}

export async function updateOrderStatusRow(
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<Order | null> {
  const { data, error } = await db().rpc("admin_update_order_status", {
    p_order_id: orderId.trim(),
    p_status: status,
    p_note: note?.trim().slice(0, 500) || null,
  });
  if (error || !data?.ok) {
    const businessError = atomicBusinessError(error?.message);
    console.error(
      "[orders] admin_update_order_status failed:",
      businessError ?? error,
    );
    return null;
  }
  return getOrderByPublicId(orderId);
}

export type DeleteOrderResult =
  | { ok: true }
  | { ok: false; error: string; status: 404 | 409 | 503 };

export async function deleteOrderRow(orderId: string): Promise<DeleteOrderResult> {
  const { data, error } = await db().rpc("admin_delete_demo_order", {
    p_order_id: orderId.trim(),
  });
  if (!error && data?.ok) return { ok: true };

  const businessError = atomicBusinessError(error?.message);
  if (businessError) {
    return {
      ok: false,
      error: businessError,
      status: /not found/i.test(businessError) ? 404 : 409,
    };
  }
  console.error("[orders] admin_delete_demo_order failed:", error);
  return { ok: false, error: "Could not delete the practice order.", status: 503 };
}
