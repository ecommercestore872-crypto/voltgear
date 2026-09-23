import {
  idsMatchingNormalizedPhone,
  phonesMatchingNormalized,
  planManualAdd,
  suppressedPhoneSet,
} from "@/lib/broadcast-contact-rules";
import { getAllOrders } from "@/lib/order-store";
import { getServiceClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/messaging";
import type {
  BroadcastContact,
  MessageCampaign,
  MessageRecipient,
} from "@/lib/types";

function db() {
  return getServiceClient();
}

export async function getContacts(): Promise<{
  contacts: BroadcastContact[];
  manualCount: number;
  suppressed: string[];
}> {
  const [{ data: manual }, { data: suppressedRows }] = await Promise.all([
    db().from("broadcast_contacts").select("*"),
    db().from("broadcast_suppressed").select("phone"),
  ]);
  const suppressedSet = suppressedPhoneSet(
    (suppressedRows ?? []).map((r) => String(r.phone))
  );
  const suppressed = Array.from(suppressedSet);
  const orders = await getAllOrders();

  const fromOrders = new Map<string, { name: string; city: string; lastAt: number }>();
  for (const order of orders) {
    const phone = normalizePhone(order.customer?.phone ?? "");
    if (!phone) continue;
    const existing = fromOrders.get(phone);
    const at = new Date(order.createdAt).getTime();
    if (!existing || at > existing.lastAt) {
      fromOrders.set(phone, {
        name: order.customer?.name ?? "",
        city: order.customer?.city ?? "",
        lastAt: at,
      });
    }
  }

  const contacts: BroadcastContact[] = [];
  fromOrders.forEach((info, phone) => {
    if (suppressedSet.has(phone)) return;
    contacts.push({
      id: `order-${phone}`,
      phone,
      name: info.name || undefined,
      city: info.city || undefined,
      source: "order",
    });
  });

  const seenManual = new Set<string>();
  let manualCount = 0;
  for (const m of manual ?? []) {
    const phone = normalizePhone(String(m.phone ?? ""));
    if (!phone || suppressedSet.has(phone) || fromOrders.has(phone) || seenManual.has(phone)) {
      continue;
    }
    seenManual.add(phone);
    manualCount += 1;
    contacts.push({
      id: `manual-${m.id}`,
      phone,
      name: m.name ? String(m.name) : undefined,
      city: m.city ? String(m.city) : undefined,
      note: m.note ? String(m.note) : undefined,
      source: "manual",
    });
  }

  contacts.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  return { contacts, manualCount, suppressed };
}

async function deleteSuppressedVariants(phone: string): Promise<void> {
  const { data, error } = await db().from("broadcast_suppressed").select("phone");
  if (error) {
    console.error("[messaging] list suppressed failed:", error);
    return;
  }
  const matching = phonesMatchingNormalized(
    (data ?? []).map((row) => String(row.phone ?? "")),
    phone
  );
  if (!matching.length) return;
  const { error: delError } = await db().from("broadcast_suppressed").delete().in("phone", matching);
  if (delError) {
    console.error("[messaging] unsuppress failed:", delError);
  }
}

export async function addManualContact(input: {
  phone: string;
  name?: string;
  city?: string;
  note?: string;
}): Promise<{ ok: boolean; updated?: boolean; error?: string }> {
  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, error: "Enter a valid Pakistani mobile number." };

  const [{ data: manualRows, error: listError }, { contacts }] = await Promise.all([
    db().from("broadcast_contacts").select("id, phone"),
    getContacts(),
  ]);
  if (listError) {
    console.error("[messaging] list contacts failed:", listError);
    return { ok: false, error: "Could not save that contact." };
  }

  const plan = planManualAdd({
    phone,
    visibleContacts: contacts,
    manualRows: (manualRows ?? []).map((row) => ({
      id: String(row.id),
      phone: row.phone != null ? String(row.phone) : null,
    })),
  });
  if (plan.action === "reject") {
    return { ok: false, error: plan.error };
  }

  const fields = {
    phone,
    name: input.name?.trim() || null,
    city: input.city?.trim() || null,
    note: input.note?.trim() || null,
  };

  if (plan.action === "update") {
    const { error } = await db()
      .from("broadcast_contacts")
      .update(fields)
      .in("id", plan.ids);
    if (error) {
      console.error("[messaging] update contact failed:", error);
      return { ok: false, error: "Could not save that contact." };
    }
  } else {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { error } = await db().from("broadcast_contacts").insert({ id, ...fields });
    if (error) {
      console.error("[messaging] insert contact failed:", error);
      return { ok: false, error: "Could not save that contact." };
    }
  }

  await deleteSuppressedVariants(phone);
  return { ok: true, updated: plan.action === "update" };
}

export async function removeContact(phoneRaw: string): Promise<{ ok: boolean }> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false };

  const { data: manualRows, error: listError } = await db()
    .from("broadcast_contacts")
    .select("id, phone");
  if (listError) {
    console.error("[messaging] list contacts for delete failed:", listError);
    return { ok: false };
  }

  const ids = idsMatchingNormalizedPhone(
    (manualRows ?? []).map((row) => ({
      id: String(row.id),
      phone: row.phone != null ? String(row.phone) : null,
    })),
    phone
  );
  if (ids.length) {
    const { error } = await db().from("broadcast_contacts").delete().in("id", ids);
    if (error) {
      console.error("[messaging] delete contact failed:", error);
      return { ok: false };
    }
  }

  const { error: suppressError } = await db().from("broadcast_suppressed").upsert({ phone });
  if (suppressError) {
    console.error("[messaging] suppress failed:", suppressError);
    return { ok: false };
  }
  return { ok: true };
}

export async function unSuppress(phoneRaw: string): Promise<{ ok: boolean }> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false };
  await deleteSuppressedVariants(phone);
  return { ok: true };
}

export async function createCampaign(
  name: string | undefined,
  text: string,
  results: {
    phone: string;
    name?: string;
    status: MessageRecipient["status"];
    messageId?: string;
    error?: string;
  }[]
): Promise<string | null> {
  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const { data, error } = await db()
    .from("message_campaigns")
    .insert({
      name: name?.trim() || null,
      text,
      sent,
      failed,
      queued: results.length - sent - failed,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[messaging] campaign create failed:", error);
    return null;
  }
  if (results.length) {
    await db().from("message_recipients").insert(
      results.map((r) => ({
        campaign_id: data.id,
        phone: r.phone,
        name: r.name || null,
        status: r.status,
        message_id: r.messageId || null,
        error: r.error || null,
        sent_at: r.status === "sent" ? new Date().toISOString() : null,
      }))
    );
  }
  return String(data.id);
}

function mapCampaign(
  row: Record<string, unknown>,
  recipients: MessageRecipient[]
): MessageCampaign {
  return {
    _id: String(row.id),
    name: row.name ? String(row.name) : undefined,
    text: String(row.text ?? ""),
    recipients,
    sent: Number(row.sent ?? 0),
    failed: Number(row.failed ?? 0),
    queued: Number(row.queued ?? 0),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

async function recipientsFor(campaignId: string): Promise<MessageRecipient[]> {
  const { data } = await db()
    .from("message_recipients")
    .select("*")
    .eq("campaign_id", campaignId);
  return (data ?? []).map((r) => ({
    phone: String(r.phone ?? ""),
    name: r.name ? String(r.name) : undefined,
    status: r.status as MessageRecipient["status"],
    messageId: r.message_id ? String(r.message_id) : undefined,
    sentAt: r.sent_at ? String(r.sent_at) : undefined,
    error: r.error ? String(r.error) : undefined,
  }));
}

export async function listCampaigns(): Promise<MessageCampaign[]> {
  const { data, error } = await db()
    .from("message_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return Promise.all(
    (data ?? []).map(async (row) =>
      mapCampaign(row as Record<string, unknown>, await recipientsFor(String(row.id)))
    )
  );
}

export async function getCampaign(id: string): Promise<MessageCampaign | null> {
  const { data, error } = await db().from("message_campaigns").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapCampaign(data as Record<string, unknown>, await recipientsFor(id));
}

export async function updateCampaignResults(
  id: string,
  recipients: MessageRecipient[]
): Promise<boolean> {
  const { error } = await db()
    .from("message_campaigns")
    .update({
      sent: recipients.filter((r) => r.status === "sent").length,
      failed: recipients.filter((r) => r.status === "failed").length,
      queued: recipients.filter((r) => r.status === "queued").length,
    })
    .eq("id", id);
  if (error) {
    console.error("[messaging] updateCampaignResults failed:", error);
    return false;
  }
  await db().from("message_recipients").delete().eq("campaign_id", id);
  if (recipients.length) {
    await db().from("message_recipients").insert(
      recipients.map((r) => ({
        campaign_id: id,
        phone: r.phone,
        name: r.name || null,
        status: r.status,
        message_id: r.messageId || null,
        error: r.error || null,
        sent_at: r.sentAt || null,
      }))
    );
  }
  return true;
}
