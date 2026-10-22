import type { Metadata } from "next";

import { NewsletterList } from "@/components/admin/newsletter-list";
import { listNewsletterSubscribersPage, type NewsletterPage } from "@/lib/db/newsletter-store";
import { NEWSLETTER_PAGE_SIZE, newsletterListFilters } from "@/lib/newsletter-pagination-rules";

export const metadata: Metadata = {
  title: "Newsletter",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage({ searchParams }: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const filters = newsletterListFilters(await searchParams);
  let result: NewsletterPage = { subscribers: [], total: 0, page: filters.page, pageSize: NEWSLETTER_PAGE_SIZE };
  let loadError: string | null = null;
  try {
    result = await listNewsletterSubscribersPage(filters);
  } catch {
    loadError = "Newsletter data is temporarily unavailable. Please retry shortly.";
  }

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {loadError}
        </p>
      ) : null}
      <NewsletterList subscribers={result.subscribers} total={result.total} pageSize={result.pageSize} filters={filters} loadFailed={Boolean(loadError)} />
    </div>
  );
}
