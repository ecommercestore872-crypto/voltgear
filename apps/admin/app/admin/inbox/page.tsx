import type { Metadata } from "next";

import { InboxList } from "@/components/admin/inbox-list";
import { listContactSubmissionsPage, type InboxPage } from "@/lib/db/inbox-store";
import { INBOX_PAGE_SIZE, inboxListFilters } from "@/lib/inbox-pagination-rules";

export const metadata: Metadata = {
  title: "Inbox",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminInboxPage({ searchParams }: {
  searchParams: Promise<{ kind?: string; status?: string; q?: string; page?: string }>;
}) {
  const filters = inboxListFilters(await searchParams);
  let result: InboxPage = { items: [], total: 0, page: filters.page, pageSize: INBOX_PAGE_SIZE };
  let loadError: string | null = null;
  try {
    result = await listContactSubmissionsPage(filters);
  } catch {
    loadError = "Inbox data is temporarily unavailable. Please retry shortly.";
  }

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {loadError}
        </p>
      ) : null}
      <InboxList initialItems={result.items} total={result.total} pageSize={result.pageSize} filters={filters} loadFailed={Boolean(loadError)} />
    </div>
  );
}
