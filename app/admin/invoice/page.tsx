import type { Metadata } from "next";

import { InvoiceTemplateForm } from "@/components/admin/invoice-template-form";
import { editorInvoiceTemplate, getAdminSettings } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Invoice template",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminInvoiceTemplatePage() {
  const row = (await getAdminSettings()) as Record<string, unknown> | null;
  const draft =
    row?.draft && typeof row.draft === "object" ? (row.draft as Record<string, unknown>) : null;
  const config = editorInvoiceTemplate(row);
  const hasDraft = Boolean(draft?.invoiceTemplate);
  return (
    <InvoiceTemplateForm
      key={`${hasDraft ? "draft" : "live"}:${JSON.stringify(config)}`}
      config={config}
      hasDraft={hasDraft}
    />
  );
}
