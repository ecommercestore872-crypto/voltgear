import { getServiceClient } from "@/lib/supabase/server";
import {
  parseInboxStatus,
  type InboxKind,
  type InboxStatus,
  validateContactSubmission,
} from "@/lib/db/inbox-rules";

function db() {
  return getServiceClient();
}

export type InboxItem = {
  id: string;
  kind: InboxKind;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: InboxStatus;
  adminNote: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

function mapRow(row: Record<string, unknown>): InboxItem {
  return {
    id: String(row.id),
    kind: row.kind === "complaint" ? "complaint" : "contact",
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    subject: String(row.subject ?? ""),
    message: String(row.message ?? ""),
    status:
      row.status === "read" || row.status === "closed"
        ? row.status
        : "new",
    adminNote: row.admin_note != null ? String(row.admin_note) : null,
    isDemo: Boolean(row.is_demo),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
    closedAt: row.closed_at != null ? String(row.closed_at) : null,
  };
}

export async function createContactSubmission(input: {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  kind?: unknown;
  isDemo?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string; status: number }> {
  const parsed = validateContactSubmission(input);
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };

  const { data, error } = await db()
    .from("contact_submissions")
    .insert({
      kind: parsed.data.kind,
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
      status: "new",
      is_demo: Boolean(input.isDemo),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[inbox] insert failed", error.message);
    return { ok: false, error: "Failed to save message.", status: 500 };
  }
  return { ok: true, id: String(data.id) };
}

export async function listContactSubmissions(opts?: {
  kind?: InboxKind;
  status?: InboxStatus;
  includeDemo?: boolean;
}): Promise<InboxItem[]> {
  let q = db()
    .from("contact_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!opts?.includeDemo) q = q.eq("is_demo", false);
  if (opts?.kind) q = q.eq("kind", opts.kind);
  if (opts?.status) q = q.eq("status", opts.status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getContactSubmission(id: string): Promise<InboxItem | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  const { data, error } = await db()
    .from("contact_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function updateContactSubmission(
  id: string,
  patch: { status?: unknown; adminNote?: unknown }
): Promise<{ ok: true; item: InboxItem } | { ok: false; error: string; status: number }> {
  const updates: Record<string, unknown> = {};
  if (patch.status !== undefined) {
    const status = parseInboxStatus(patch.status);
    if (!status) return { ok: false, error: "Invalid status.", status: 400 };
    updates.status = status;
  }
  if (patch.adminNote !== undefined) {
    const note = String(patch.adminNote ?? "").trim();
    if (note.length > 2000) {
      return { ok: false, error: "Admin note must be 2,000 characters or fewer.", status: 400 };
    }
    updates.admin_note = note || null;
  }
  if (!Object.keys(updates).length) {
    return { ok: false, error: "Nothing to update.", status: 400 };
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, error: "Invalid submission id.", status: 400 };
  }
  const { data, error } = await db()
    .rpc("admin_update_contact_submission", {
      p_id: id,
      p_status: updates.status ?? null,
      p_admin_note: updates.admin_note ?? null,
      p_set_note: Object.prototype.hasOwnProperty.call(updates, "admin_note"),
    })
    .maybeSingle();

  if (error) {
    console.error("[inbox] update failed", error.message);
    return { ok: false, error: "Failed to update.", status: 500 };
  }
  if (!data) return { ok: false, error: "Not found.", status: 404 };
  return { ok: true, item: mapRow(data as Record<string, unknown>) };
}

export async function listContactSubmissionsForEmail(email: string): Promise<InboxItem[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];
  const { data, error } = await db()
    .from("contact_submissions")
    .select("*")
    .eq("is_demo", false)
    .ilike("email", normalized)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}
