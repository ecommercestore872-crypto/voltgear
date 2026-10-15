import { getServiceClient } from "@/lib/supabase/server";
import type { EmailEventKind } from "@/lib/types";

function db() {
  return getServiceClient();
}

export async function enqueueEmailEventRow(
  kind: EmailEventKind,
  email: string,
  data: unknown,
  delayMs: number
): Promise<void> {
  const dueAt = new Date(Date.now() + delayMs).toISOString();
  const { error } = await db().from("email_events").insert({
    kind,
    email,
    data,
    due_at: dueAt,
  });
  if (error) console.error("[flows] enqueue failed:", error);
}

export async function getPendingEmailEvents(): Promise<
  { _id: string; kind: EmailEventKind; email: string; data?: string; dueAt?: string }[]
> {
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("email_events")
    .select("*")
    .is("sent_at", null)
    .lte("due_at", now)
    .order("due_at", { ascending: true });
  if (error) return [];
  return (data ?? []).map((e) => ({
    _id: String(e.id),
    kind: e.kind as EmailEventKind,
    email: String(e.email),
    data: e.data != null ? JSON.stringify(e.data) : undefined,
    dueAt: e.due_at ? String(e.due_at) : undefined,
  }));
}

export async function markEmailSent(eventId: string, sentAt = new Date().toISOString()): Promise<void> {
  const { error } = await db().from("email_events").update({ sent_at: sentAt }).eq("id", eventId);
  if (error) console.error("[flows] mark sent failed:", error);
}

export async function recentWinbackExists(email: string, sinceIso: string): Promise<boolean> {
  const { data, error } = await db()
    .from("email_events")
    .select("id")
    .eq("kind", "win-back")
    .eq("email", email)
    .gt("created_at", sinceIso)
    .limit(1);
  if (error) return false;
  return Boolean(data?.length);
}
