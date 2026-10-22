export const NEWSLETTER_PAGE_SIZE = 50;
export const NEWSLETTER_EXPORT_BATCH_SIZE = 500;

export type NewsletterListFilters = {
  status: "all" | "subscribed" | "unsubscribed";
  q: string;
  page: number;
};

export function normalizeNewsletterPage(raw: unknown): number {
  const page = Number(raw);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 1_000_000) : 1;
}

export function normalizeNewsletterSearch(raw: unknown): string {
  return String(raw ?? "").replace(/[,%_()\\"*]/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, 80);
}

export function newsletterListFilters(raw: {
  status?: unknown; q?: unknown; page?: unknown;
}): NewsletterListFilters {
  return {
    status: raw.status === "subscribed" || raw.status === "unsubscribed" ? raw.status : "all",
    q: normalizeNewsletterSearch(raw.q),
    page: normalizeNewsletterPage(raw.page),
  };
}

export function newsletterListHref(filters: NewsletterListFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== "all") params.set("status", filters.status);
  const q = normalizeNewsletterSearch(filters.q);
  if (q) params.set("q", q);
  if (filters.page > 1) params.set("page", String(filters.page));
  return `/admin/newsletter${params.size ? `?${params}` : ""}`;
}
