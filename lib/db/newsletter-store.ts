import { getServiceClient } from "@/lib/supabase/server";
import { normalizeNewsletterEmail } from "@/lib/newsletter-rules";

function db() {
  return getServiceClient();
}

export type NewsletterSubscriber = {
  id: string;
  email: string;
  source: string;
  createdAt: string;
};

function mapRow(row: Record<string, unknown>): NewsletterSubscriber {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    source: String(row.source ?? "footer"),
    createdAt: String(row.created_at ?? ""),
  };
}

export async function subscribeNewsletter(input: {
  email?: unknown;
  source?: string;
}): Promise<{ ok: true; created: boolean } | { ok: false; error: string; status: number }> {
  const parsed = normalizeNewsletterEmail(input.email);
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };

  const { data, error } = await db()
    .from("newsletter_subscribers")
    .upsert(
      {
        email: parsed.email,
        email_normalized: parsed.email,
        source: input.source || "footer",
      },
      { onConflict: "email_normalized", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[newsletter] persist failed", error.message);
    return { ok: false, error: "Could not save that email. Try again.", status: 500 };
  }

  return { ok: true, created: Boolean(data?.id) };
}

export async function listNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const { data, error } = await db()
    .from("newsletter_subscribers")
    .select("id, email, source, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}
