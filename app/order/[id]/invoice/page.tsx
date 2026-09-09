import { notFound } from "next/navigation";

import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { OrderEmailGate } from "@/components/order/order-email-gate";
import { getOrderByPublicId, fetchSiteSettings } from "@/lib/db/store";
import { shopperLookupNotFound } from "@/lib/db/order-rules";
import {
  invoiceFileTitle,
  mergeInvoiceTemplate,
  resolveInvoiceIdentity,
} from "@/lib/invoice-template-rules";
import PrintButton from "./print-button";
import "./invoice.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: invoiceFileTitle(params.id),
    robots: { index: false, follow: false },
  };
}

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { email?: string };
}) {
  const [order, settings] = await Promise.all([
    getOrderByPublicId(params.id),
    fetchSiteSettings().catch(() => null),
  ]);
  if (!order) return notFound();

  const email =
    typeof searchParams?.email === "string" ? searchParams.email.trim() : "";
  if (!email) {
    return <OrderEmailGate orderId={params.id} pathSuffix="/invoice" />;
  }
  if (shopperLookupNotFound(order, email)) {
    return notFound();
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
