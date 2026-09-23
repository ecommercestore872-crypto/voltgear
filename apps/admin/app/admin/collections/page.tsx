import type { Metadata } from "next";

import { CollectionsManager } from "@/components/admin/collections-manager";
import { listAdminCollections } from "@/lib/db/collection-store";

export const metadata: Metadata = {
  title: "Collections",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  let collections: Awaited<ReturnType<typeof listAdminCollections>> = [];
  let loadError: string | null = null;
  try {
    collections = await listAdminCollections();
  } catch {
    loadError =
      "Collections table missing. Push migration 20260901040000_collections.sql.";
  }
  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {loadError}
        </p>
      ) : null}
      <CollectionsManager initial={collections} />
    </div>
  );
}
