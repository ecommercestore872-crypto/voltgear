import { normalizeEmailForSuppression } from "@/lib/resend-webhook-rules";
import { getServiceClient } from "@/lib/supabase/server";

function db() {
  return getServiceClient({ admin: true });
}

export async function upsertEmailSuppression(
  email: string,
  reason: "bounce" | "complaint",
  source = "resend_webhook",
): Promise<void> {
  const email_normalized = normalizeEmailForSuppression(email);
  const now = new Date().toISOString();
  const { error } = await db().from("email_suppressions").upsert(
    {
      email_normalized,
      reason,
      source,
      last_event_at: now,
    },
    { onConflict: "email_normalized" },
  );
  if (error) console.error("[email-suppression] upsert failed:", error.message);
}

export async function isEmailSuppressed(email: string): Promise<boolean> {
  const email_normalized = normalizeEmailForSuppression(email);
  if (!email_normalized.includes("@")) return false;
  const { data, error } = await db()
    .from("email_suppressions")
    .select("email_normalized")
    .eq("email_normalized", email_normalized)
    .maybeSingle();
  if (error) {
    console.error("[email-suppression] lookup failed:", error.message);
    return false;
  }
  return Boolean(data?.email_normalized);
}
