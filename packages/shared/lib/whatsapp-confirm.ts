import { SHOPPER_BRAND } from "@/lib/brand";
import { fetchSiteSettings } from "@/lib/db/store";
import {
  normalizePhone,
  sendWhatsAppOrderConfirmRequest,
  sendWhatsAppText,
  whatsappConfigured,
} from "@/lib/messaging";
import { appendOrderNote, cancelOrder, getOrderById, updateOrderStatus } from "@/lib/order-store";
import { bookOrderOnPostEx } from "@/lib/postex-book-order-run";
import { getServiceClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { sendAdminPush } from "@/lib/admin-push";
import { classifyConfirmReply } from "@/lib/whatsapp-confirm-rules";

function db() {
  return getServiceClient({ admin: true });
}

const ATTENTION_URL = "/admin/orders?tab=attention";

async function logMessage(row: {
  id?: string | null;
  direction: "in" | "out";
  phone: string;
  orderId?: string;
  body: string;
  action?: string;
}) {
  if (!row.id) return;
  await db()
    .from("whatsapp_messages")
    .upsert(
      {
        wa_message_id: row.id,
        direction: row.direction,
        phone: row.phone,
        order_id: row.orderId ?? null,
        body: row.body.slice(0, 1000),
        action: row.action ?? null,
      },
      { onConflict: "wa_message_id", ignoreDuplicates: true },
    );
}

/** Owner sees the order in the "Needs reply" tab and gets a push. */
async function flagForOwner(orderIds: string[], reply: string, why: string) {
  await db()
    .from("orders")
    .update({ wa_confirmation_state: "needs_attention", wa_last_reply: reply.slice(0, 500), wa_updated_at: new Date().toISOString() })
    .in("order_id", orderIds);
  await sendAdminPush({
    title: why,
    body: `${orderIds.join(", ")}: "${reply.slice(0, 120)}"`,
    url: ATTENTION_URL,
    tag: `wa-${orderIds[0]}`,
  });
}

/** Sends the "reply YES to confirm" message for a fresh COD order. Safe to call twice: only the first call sends. */
export async function requestOrderConfirmation(orderId: string): Promise<{ sent: boolean; reason?: string }> {
  if (!whatsappConfigured()) return { sent: false, reason: "whatsapp_not_configured" };
  const settings = await fetchSiteSettings().catch(() => null);
  if (!settings?.whatsappConfirmFlow) return { sent: false, reason: "flow_off" };

  const order = await getOrderById(orderId);
  if (!order || order.isDemo || order.status !== "new") return { sent: false, reason: "not_eligible" };
  const phone = normalizePhone(order.customer?.phone ?? "");
  if (!phone) {
    await appendOrderNote(orderId, "WhatsApp confirmation skipped: phone number is not a valid Pakistani mobile.").catch(() => undefined);
    return { sent: false, reason: "bad_phone" };
  }

  const { data: claimed } = await db()
    .from("orders")
    .update({ wa_confirmation_state: "awaiting_reply", wa_phone: phone, wa_updated_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .is("wa_confirmation_state", null)
    .select("order_id");
  if (!claimed?.length) return { sent: false, reason: "already_requested" };

  const store = settings.brandName?.trim() || SHOPPER_BRAND.fallbackStoreName;
  const name = order.customer?.name?.trim() || "there";
  const total = formatPrice(order.total ?? 0);
  const text =
    `Assalam o Alaikum ${name}! Your ${store} order ${orderId} (${total}, cash on delivery) has been received.\n` +
    `Reply *YES* to confirm it, or *NO* to cancel it.\n` +
    `Order confirm karne ke liye *YES*, cancel karne ke liye *NO* likhein.`;
  const result = await sendWhatsAppOrderConfirmRequest(phone, { name, orderId, total, text });

  if (result.status !== "sent") {
    await db().from("orders").update({ wa_confirmation_state: null, wa_phone: null }).eq("order_id", orderId);
    await appendOrderNote(orderId, `WhatsApp confirmation not sent: ${result.error ?? "unknown error"}`).catch(() => undefined);
    return { sent: false, reason: "send_failed" };
  }
  await logMessage({ id: result.messageId, direction: "out", phone, orderId, body: text, action: "confirm_request" });
  return { sent: true };
}

/** Handles one inbound WhatsApp text. Idempotent on the WhatsApp message id. */
export async function handleInboundWhatsApp(msg: { id: string; from: string; text: string }): Promise<void> {
  const phone = normalizePhone(msg.from);
  if (!phone) return;

  const { data: fresh } = await db()
    .from("whatsapp_messages")
    .upsert(
      { wa_message_id: msg.id, direction: "in", phone, body: msg.text.slice(0, 1000) },
      { onConflict: "wa_message_id", ignoreDuplicates: true },
    )
    .select("wa_message_id");
  if (!fresh?.length) return; // Meta retry

  const { data: awaiting } = await db()
    .from("orders")
    .select("order_id")
    .eq("wa_phone", phone)
    .eq("wa_confirmation_state", "awaiting_reply")
    .eq("status", "new")
    .order("created_at", { ascending: false });
  const ids = (awaiting ?? []).map((r) => String(r.order_id));

  if (ids.length === 0) {
    // Not an answer to a pending confirmation: show it on the latest order from this number, else just push.
    const { data: latest } = await db()
      .from("orders")
      .select("order_id, wa_confirmation_state")
      .eq("wa_phone", phone)
      .order("created_at", { ascending: false })
      .limit(1);
    // A repeated "ok" or "yes" after we already acted needs no owner attention.
    if (latest?.[0]?.wa_confirmation_state && classifyConfirmReply(msg.text) !== "review") return;
    if (latest?.length) await flagForOwner([String(latest[0].order_id)], msg.text, "Customer message on WhatsApp");
    else await sendAdminPush({ title: "WhatsApp message", body: `${phone}: "${msg.text.slice(0, 120)}"`, url: "/admin/orders", tag: `wa-${phone}` });
    return;
  }
  if (ids.length > 1) {
    await flagForOwner(ids, msg.text, "Customer replied, several orders pending");
    return;
  }

  const orderId = ids[0];
  const action = classifyConfirmReply(msg.text);
  if (action === "review") {
    await flagForOwner([orderId], msg.text, "Customer replied on WhatsApp");
    return;
  }

  // Only one webhook delivery may win the claim.
  const { data: won } = await db()
    .from("orders")
    .update({
      wa_confirmation_state: action === "confirm" ? "confirmed" : "declined",
      wa_last_reply: msg.text.slice(0, 500),
      wa_updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId)
    .eq("wa_confirmation_state", "awaiting_reply")
    .select("order_id");
  if (!won?.length) return;
  await db().from("whatsapp_messages").update({ order_id: orderId, action }).eq("wa_message_id", msg.id);

  if (action === "decline") {
    const result = await cancelOrder(orderId, "Declined by customer on WhatsApp");
    if (!result.ok) {
      await flagForOwner([orderId], msg.text, `Customer declined but cancel failed: ${result.error}`);
      return;
    }
    await sendWhatsAppText(phone, `Your order ${orderId} has been cancelled. Thank you for letting us know.`);
    await sendAdminPush({ title: `Order ${orderId} cancelled`, body: "Customer declined on WhatsApp.", url: "/admin/orders?tab=cancelled", tag: `wa-${orderId}` });
    return;
  }

  const confirmed = await updateOrderStatus(orderId, "processing", "Confirmed by customer on WhatsApp");
  if (!confirmed) {
    await flagForOwner([orderId], msg.text, "Customer confirmed but status update failed");
    return;
  }
  const booked = await bookOrderOnPostEx(orderId);
  const tracking = typeof booked.body.trackingNumber === "string" ? booked.body.trackingNumber : "";
  if (booked.status !== 200) {
    const error = typeof booked.body.error === "string" ? booked.body.error : "unknown error";
    await appendOrderNote(orderId, `PostEx booking failed after WhatsApp confirmation: ${error}`).catch(() => undefined);
    await flagForOwner([orderId], msg.text, `Order ${orderId} confirmed, PostEx booking failed`);
  } else {
    await sendAdminPush({ title: `Order ${orderId} confirmed`, body: `Booked on PostEx. Tracking ${tracking}`, url: "/admin/orders?tab=processing", tag: `wa-${orderId}` });
  }
  await sendWhatsAppText(phone, `Thank you! Your order ${orderId} is confirmed. We will update you when it ships.`);
}

/** Owner dealt with the reply (confirmed or cancelled manually, or pressed "Mark handled"). */
export async function clearWhatsAppAttention(orderId: string): Promise<void> {
  await db()
    .from("orders")
    .update({ wa_confirmation_state: null, wa_updated_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("wa_confirmation_state", "needs_attention");
}

/** Owner changed the status by hand: keep the WhatsApp state truthful so a late "yes" cannot redo it. */
export async function syncWhatsAppStateAfterStatus(orderId: string, status: string): Promise<void> {
  if (status === "new") return;
  await db()
    .from("orders")
    .update({ wa_confirmation_state: status === "cancelled" ? "declined" : "confirmed", wa_updated_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .in("wa_confirmation_state", ["awaiting_reply", "needs_attention"]);
}
