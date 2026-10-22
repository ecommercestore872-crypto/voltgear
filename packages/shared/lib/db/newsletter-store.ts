import { getServiceClient } from "@/lib/supabase/server";
import {
  NEWSLETTER_EXPORT_BATCH_SIZE,
  NEWSLETTER_PAGE_SIZE,
  newsletterListFilters,
  type NewsletterListFilters,
} from "@/lib/newsletter-pagination-rules";
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

const SUBSCRIBER_SELECT = "id, email, source, status, consent_at, unsubscribed_at, created_at";

export type NewsletterPage = {
  subscribers: NewsletterSubscriber[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listNewsletterSubscribersPage(
  opts: Partial<NewsletterListFilters> = {},
): Promise<NewsletterPage> {
  const filters = newsletterListFilters(opts);
  let query = getServiceClient({ admin: true })
    .from("newsletter_subscribers")
    .select(SUBSCRIBER_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    query = query.or(`email.ilike.${pattern},source.ilike.${pattern}`);
  }
  const from = (filters.page - 1) * NEWSLETTER_PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + NEWSLETTER_PAGE_SIZE - 1);
  if (error) throw error;
  return {
    subscribers: (data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
    total: count ?? 0,
    page: filters.page,
    pageSize: NEWSLETTER_PAGE_SIZE,
  };
}

/** Stable keyset batches, bounded to records created by the export high water. */
export async function* subscribedNewsletterBatches(): AsyncGenerator<NewsletterSubscriber[], void> {
  const client = getServiceClient({ admin: true });
  const highWaterResult = await client.from("newsletter_subscribers")
    .select("created_at")
    .eq("status", "subscribed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (highWaterResult.error) throw highWaterResult.error;
  if (!highWaterResult.data) return;
  const highWater = String(highWaterResult.data.created_at);
  let afterId: string | null = null;
  while (true) {
    let query = client.from("newsletter_subscribers")
      .select(SUBSCRIBER_SELECT)
      .eq("status", "subscribed")
      .lte("created_at", highWater)
      .order("id", { ascending: true })
      .limit(NEWSLETTER_EXPORT_BATCH_SIZE);
    if (afterId) query = query.gt("id", afterId);
    const { data, error } = await query;
    if (error) throw error;
    const batch = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
    if (!batch.length) return;
    afterId = batch[batch.length - 1].id;
    yield batch;
    if (batch.length < NEWSLETTER_EXPORT_BATCH_SIZE) return;
  }
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
