import { formatPrice } from "@/lib/utils";
import type { Order } from "@/lib/types";
import {
  invoiceFileTitle,
  invoiceTotals,
  type InvoiceIdentity,
  type InvoiceTemplate,
} from "@/lib/invoice-template-rules";

function formatInvoiceDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function InvoiceDocument({
  order,
  template,
  identity,
}: {
  order: Order;
  template: InvoiceTemplate;
  identity: InvoiceIdentity;
}) {
  const { lines, subtotal, shipping, total, showSubtotal } = invoiceTotals(order);
  const isCod = order.payment === "cod";
  const customer = order.customer;
  const accent = template.accent || "#1F3626";
  const title = template.documentTitle || "Invoice";
  const contact = [identity.email, identity.phone].filter(Boolean).join("  ·  ");
  const billLines = [
    customer?.address?.trim(),
    customer?.city?.trim(),
    customer?.postal?.trim(),
  ].filter(Boolean);

  return (
    <article
      id="printable-invoice"
      className="invoice-sheet"
      style={{ ["--invoice-accent" as string]: accent }}
      aria-label={`${title} ${order.orderId}`}
    >
      <header className="invoice-head">
        <div className="invoice-brand">
          {identity.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={identity.logo} alt={identity.name} className="invoice-logo" />
          ) : (
            <p className="invoice-wordmark">{identity.name}</p>
          )}
          {identity.logo ? <p className="invoice-brand-name">{identity.name}</p> : null}
          {identity.address ? <p className="invoice-meta">{identity.address}</p> : null}
          {contact ? <p className="invoice-meta">{contact}</p> : null}
          {identity.website ? <p className="invoice-meta">{identity.website}</p> : null}
        </div>
        <div className="invoice-kicker">
          <p className="invoice-title">{title}</p>
          <dl className="invoice-ids">
            <div>
              <dt>No.</dt>
              <dd>{order.orderId}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatInvoiceDate(order.createdAt)}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>{isCod ? "Cash on delivery" : "Paid"}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="invoice-parties">
        <div>
          <h2>Bill to</h2>
          {customer?.name ? <p className="invoice-party-name">{customer.name}</p> : null}
          {billLines.length ? (
            <p className="invoice-meta">{billLines.join(", ")}</p>
          ) : null}
          {customer?.phone ? <p className="invoice-meta">{customer.phone}</p> : null}
          {customer?.email ? <p className="invoice-meta">{customer.email}</p> : null}
        </div>
      </section>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Qty</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.length ? (
            lines.map((line, i) => (
              <tr key={`${line.name}-${i}`}>
                <td>
                  <span className="item-name">{line.name}</span>
                  {line.variant ? <span className="item-variant">{line.variant}</span> : null}
                </td>
                <td className="num">{line.quantity}</td>
                <td className="num">{formatPrice(line.lineTotal)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>No items</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="invoice-totals">
        {showSubtotal ? (
          <div>
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        ) : null}
        {shipping > 0 ? (
          <div>
            <span>Shipping</span>
            <span>{formatPrice(shipping)}</span>
          </div>
        ) : null}
        <div className="grand">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {template.notes ? <p className="invoice-notes">{template.notes}</p> : null}
      <footer className="invoice-foot">
        <p>{template.footer}</p>
        <p className="invoice-file">{invoiceFileTitle(order.orderId)}</p>
      </footer>
    </article>
  );
}
