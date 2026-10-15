import {
  idsMatchingNormalizedPhone,
  phonesMatchingNormalized,
  planManualAdd,
  suppressedPhoneSet,
} from "@/lib/broadcast-contact-rules";
import { listOrderPhoneContacts } from "@/lib/db/broadcast-order-contacts";
import { normalizePhone } from "@/lib/messaging";
import { getServiceClient } from "@/lib/supabase/server";
import type { BroadcastContact } from "@/lib/types";

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
    (suppressedRows ?? []).map((row) => String(row.phone)),
  );
  const suppressed = Array.from(suppressedSet);
  const phoneContacts = await listOrderPhoneContacts();
  const fromOrders = new Map<string, { name: string; city: string; lastAt: number }>();
  for (const contact of phoneContacts) {
    const phone = normalizePhone(contact.phone);
    if (!phone) continue;
    fromOrders.set(phone, { name: contact.name, city: "", lastAt: contact.lastAt });
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
  for (const row of manual ?? []) {
    const phone = normalizePhone(String(row.phone ?? ""));
    if (!phone || suppressedSet.has(phone) || fromOrders.has(phone) || seenManual.has(phone)) continue;
    seenManual.add(phone);
    manualCount += 1;
    contacts.push({
      id: `manual-${row.id}`,
      phone,
      name: row.name ? String(row.name) : undefined,
      city: row.city ? String(row.city) : undefined,
      note: row.note ? String(row.note) : undefined,
      source: "manual",
    });
  }

  contacts.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  return { contacts, manualCount, suppressed };
}

async function deleteSuppressedVariants(phone: string): Promise<boolean> {
  const { data, error } = await db().from("broadcast_suppressed").select("phone");
  if (error) {
    console.error("[messaging] list suppressed failed:", error);
    return false;
  }
  const matching = phonesMatchingNormalized(
    (data ?? []).map((row) => String(row.phone ?? "")),
    phone,
  );
  if (!matching.length) return true;
  const { error: deleteError } = await db()
    .from("broadcast_suppressed")
    .delete()
    .in("phone", matching);
  if (deleteError) {
    console.error("[messaging] unsuppress failed:", deleteError);
    return false;
  }
  return true;
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
  if (plan.action === "reject") return { ok: false, error: plan.error };

  const fields = {
    phone,
    name: input.name?.trim() || null,
    city: input.city?.trim() || null,
    note: input.note?.trim() || null,
  };
  if (plan.action === "update") {
    const { error } = await db().from("broadcast_contacts").update(fields).in("id", plan.ids);
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

  if (!(await deleteSuppressedVariants(phone))) {
    return { ok: false, error: "Contact saved, but suppression could not be removed." };
  }
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
    phone,
  );
  if (ids.length) {
    const { error } = await db().from("broadcast_contacts").delete().in("id", ids);
    if (error) {
      console.error("[messaging] delete contact failed:", error);
      return { ok: false };
    }
  }

  const { error } = await db().from("broadcast_suppressed").upsert({ phone });
  if (error) {
    console.error("[messaging] suppress failed:", error);
    return { ok: false };
  }
  return { ok: true };
}

export async function unSuppress(phoneRaw: string): Promise<{ ok: boolean }> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false };
  return { ok: await deleteSuppressedVariants(phone) };
}
