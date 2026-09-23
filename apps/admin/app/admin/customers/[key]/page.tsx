import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { telHref, whatsappHref } from "@/lib/contact-links";
import { getCustomerProfile } from "@/lib/db/customer-profile";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Customer",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCustomerProfilePage({
  params,
}: {
  params: { key: string };
}) {
  const profile = await getCustomerProfile(params.key).catch(() => null);
  if (!profile) notFound();

  const { customer, orders, inbox } = profile;
  const wa = whatsappHref(customer.phone);
  const tel = telHref(customer.phone);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link
            href="/admin/customers"
            className="underline-offset-4 hover:underline"
          >
            Customers
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{customer.name}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {customer.email ? (
            <a className="underline" href={`mailto:${customer.email}`}>
              {customer.email}
            </a>
          ) : (
            <span className="text-muted-foreground">No email</span>
          )}
          <span>{customer.phone || "No phone"}</span>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--g-forest)] underline-offset-2 hover:underline"
            >
              WhatsApp
            </a>
          ) : null}
          {tel ? (
            <a
              href={tel}
              className="font-medium text-[var(--g-forest)] underline-offset-2 hover:underline"
            >
              Call
            </a>
          ) : null}
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Orders ({orders.length})</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            {orders.map((o) => (
              <Link
                key={o.orderId}
                href={`/admin/orders/${encodeURIComponent(o.orderId)}`}
                className="flex min-h-11 items-center justify-between gap-3 border-b px-3 py-2 text-sm last:border-0 hover:bg-muted/30"
              >
                <span className="font-medium">{o.orderId}</span>
                <span className="text-muted-foreground">{o.status}</span>
                <span className="tabular-nums">
                  {formatPrice(o.total ?? 0)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Inbox ({inbox.length})</h2>
        {inbox.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No contact or complaint messages for this email.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            {inbox.map((m) => (
              <Link
                key={m.id}
                href="/admin/inbox"
                className="block border-b px-3 py-2 text-sm last:border-0 hover:bg-muted/30"
              >
                <span className="font-medium capitalize">{m.kind}</span>
                <span className="text-muted-foreground"> · {m.status}</span>
                <p className="mt-0.5 line-clamp-2 text-muted-foreground">
                  {m.subject || m.message}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
