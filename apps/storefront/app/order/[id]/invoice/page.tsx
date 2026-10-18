import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { OrderEmailGate } from "@/components/order/order-email-gate";
import { getOrderByPublicId, fetchSiteSettings } from "@/lib/db/store";
import { shopperLookupNotFound } from "@/lib/db/order-rules";
import { ADMIN_COOKIE } from "@/lib/db/publish";
import { getAdminSecret } from "@/lib/admin";
import {
  invoiceFileTitle,
  mergeInvoiceTemplate,
  resolveInvoiceIdentity,
} from "@/lib/invoice-template-rules";
import PrintButton from "./print-button";
import "./invoice.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: invoiceFileTitle(id),
    robots: { index: false, follow: false },
  };
}

export default async function InvoicePage(
  props: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ email?: string; phone?: string }>;
  }
) {
  const [{ id }, query, cookieStore] = await Promise.all([
    props.params,
    props.searchParams ??
      Promise.resolve<{ email?: string; phone?: string }>({}),
    cookies(),
  ]);
  const [order, settings] = await Promise.all([
    getOrderByPublicId(id),
    fetchSiteSettings().catch(() => null),
  ]);
  if (!order) return notFound();

  const isAdmin = cookieStore.get(ADMIN_COOKIE)?.value === getAdminSecret();

  const fromEmailQuery =
    typeof query.email === "string" ? query.email.trim() : "";
  const fromPhoneQuery =
    typeof query.phone === "string" ? query.phone.trim() : "";
  const fromCookie =
    cookieStore.get(`bnt_order_${id}`)?.value?.trim() ?? "";
  const emailHint = (fromEmailQuery || decodeURIComponent(fromCookie)).trim();
  const phoneHint = fromPhoneQuery;

  if (!isAdmin) {
    if (!emailHint && !phoneHint) {
      return <OrderEmailGate orderId={id} pathSuffix="/invoice" />;
    }
    if (shopperLookupNotFound(order, { email: emailHint, phone: phoneHint })) {
      return notFound();
    }
  }

  const template = mergeInvoiceTemplate(settings?.invoiceTemplate);
  const identity = resolveInvoiceIdentity(template, settings);

  return (
    <div className="invoice-page">
      <div className="invoice-toolbar print:hidden">
        <div>
          <h1>{template.documentTitle}</h1>
          <p>One page · {order.orderId}</p>
        </div>
        <PrintButton orderId={order.orderId} />
      </div>
      <div className="invoice-stage">
        <InvoiceDocument
          order={order}
          template={template}
          identity={identity}
        />
      </div>
    </div>
  );
}
