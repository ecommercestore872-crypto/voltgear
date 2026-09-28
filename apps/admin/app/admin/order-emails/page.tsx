import type { Metadata } from "next";
import nextDynamic from "next/dynamic";

import { editorOrderEmails, getAdminSettings } from "@/lib/db/admin-store";

const OrderEmailsForm = nextDynamic(
  () =>
    import("@/components/admin/order-emails-form").then((m) => m.OrderEmailsForm),
  {
    loading: () => (
      <p className="p-6 text-sm text-muted-foreground">Loading order emails…</p>
    ),
  },
);

export const metadata: Metadata = {
  title: "Order emails",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOrderEmailsPage() {
  const row = (await getAdminSettings()) as Record<string, unknown> | null;
  const draft =
    row?.draft && typeof row.draft === "object"
      ? (row.draft as Record<string, unknown>)
      : null;
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
