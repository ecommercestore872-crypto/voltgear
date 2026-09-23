import type { Metadata } from "next";

import { InboxList } from "@/components/admin/inbox-list";
import { listContactSubmissions } from "@/lib/db/inbox-store";

export const metadata: Metadata = {
  title: "Inbox",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  let items: Awaited<ReturnType<typeof listContactSubmissions>> = [];
  let loadError: string | null = null;
  try {
    items = await listContactSubmissions();
  } catch {
    loadError =
      "Inbox table is missing. Push migration 20260901030000_contact_submissions.sql to Supabase.";
  }

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {loadError}
        </p>
      ) : null}
      <InboxList initialItems={items} />
    </div>
  );
}
