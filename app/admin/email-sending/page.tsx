import type { Metadata } from "next";

import { EmailSendersForm } from "@/components/admin/email-senders-form";
import { editorEmailSenders, getAdminSettings } from "@/lib/db/admin-store";
import { resolveFromAddress } from "@/lib/email-rules";
import { SHOPPER_BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Email sending",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminEmailSendingPage() {
  const row = (await getAdminSettings()) as Record<string, unknown> | null;
  const draft =
    row?.draft && typeof row.draft === "object" ? (row.draft as Record<string, unknown>) : null;
  const config = editorEmailSenders(row);
  const hasDraft = Boolean(draft?.emailSenders);
  const fallbackFrom = resolveFromAddress({
    envFrom: process.env.FROM_EMAIL,
    brand: process.env.BRAND_NAME || SHOPPER_BRAND.spokenName,
  });
  return (
    <EmailSendersForm
      key={`${hasDraft ? "draft" : "live"}:${JSON.stringify(config)}`}
      config={config}
      hasDraft={hasDraft}
      fallbackFrom={fallbackFrom}
    />
  );
}
