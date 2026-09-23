import type { Metadata } from "next";

import { NewsletterList } from "@/components/admin/newsletter-list";
import { listNewsletterSubscribers } from "@/lib/db/newsletter-store";

export const metadata: Metadata = {
  title: "Newsletter",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  let subscribers: Awaited<ReturnType<typeof listNewsletterSubscribers>> = [];
  let loadError: string | null = null;
  try {
    subscribers = await listNewsletterSubscribers();
  } catch {
    loadError =
      "Newsletter table is missing. Push migration 20260905010000_newsletter_subscribers.sql to Supabase.";
  }

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {loadError}
        </p>
      ) : null}
      <NewsletterList subscribers={subscribers} />
    </div>
  );
}
