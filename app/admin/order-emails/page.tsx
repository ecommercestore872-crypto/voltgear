import type { Metadata } from "next";

import { OrderEmailsForm } from "@/components/admin/order-emails-form";
import { editorOrderEmails, getAdminSettings } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Order emails",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOrderEmailsPage() {
  const row = (await getAdminSettings()) as Record<string, unknown> | null;
  const draft =
    row?.draft && typeof row.draft === "object" ? (row.draft as Record<string, unknown>) : null;
  const config = editorOrderEmails(row);
  const hasDraft = Boolean(draft?.orderEmails);
  return (
    <OrderEmailsForm
      key={`${hasDraft ? "draft" : "live"}:${JSON.stringify(config)}`}
      config={config}
      hasDraft={hasDraft}
    />
  );
}
