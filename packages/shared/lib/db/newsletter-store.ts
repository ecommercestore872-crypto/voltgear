import { getServiceClient } from "@/lib/supabase/server";
import {
  normalizeNewsletterEmail,
  normalizeNewsletterSource,
} from "@/lib/newsletter-rules";

function db() {
  return getServiceClient();
}

export type NewsletterSubscriber = {
  id: string;
  email: string;
  source: string;
  createdAt: string;
  status: "subscribed" | "unsubscribed";
  consentAt: string;
  unsubscribedAt: string | null;
};

function mapRow(row: Record<string, unknown>): NewsletterSubscriber {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    source: String(row.source ?? "footer"),
    createdAt: String(row.created_at ?? ""),
    status: row.status === "unsubscribed" ? "unsubscribed" : "subscribed",
    consentAt: String(row.consent_at ?? row.created_at ?? ""),
    unsubscribedAt: row.unsubscribed_at != null ? String(row.unsubscribed_at) : null,
  };
}

export async function subscribeNewsletter(input: {
  email?: unknown;
  source?: string;
}): Promise<{ ok: true; created: boolean } | { ok: false; error: string; status: number }> {
  const parsed = normalizeNewsletterEmail(input.email);
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };

  const { data, error } = await db()
    .rpc("subscribe_newsletter", {
      p_email: parsed.email,
      p_source: normalizeNewsletterSource(input.source),
    })
    .maybeSingle();

  if (error) {
    console.error("[newsletter] persist failed", error.message);
    return { ok: false, error: "Could not save that email. Try again.", status: 500 };
  }

  return {
    ok: true,
    created: (data as { created?: boolean } | null)?.created === true,
  };
}

export async function listNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const { data, error } = await db()
    .from("newsletter_subscribers")
    .select("id, email, source, status, consent_at, unsubscribed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function unsubscribeNewsletterSubscriber(
  id: string,
): Promise<{ ok: true; subscriber: NewsletterSubscriber } | { ok: false; error: string; status: number }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, error: "Invalid subscriber id.", status: 400 };
  }
  const { data, error } = await db()
    .rpc("admin_unsubscribe_newsletter", { p_id: id })
    .maybeSingle();
  if (error) {
    console.error("[newsletter] unsubscribe failed", error.message);
    return { ok: false, error: "Could not unsubscribe this address.", status: 500 };
  }
  if (!data) return { ok: false, error: "Subscriber not found.", status: 404 };
  return { ok: true, subscriber: mapRow(data as Record<string, unknown>) };
}
