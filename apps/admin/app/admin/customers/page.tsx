import type { Metadata } from "next";
import Link from "next/link";

import { listAdminCustomers } from "@/lib/db/customer-list";

export const metadata: Metadata = {
  title: "Customers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await listAdminCustomers().catch(() => []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
      {/* Command Center Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Customer Directory
            </h1>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-orange-500/10 to-amber-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/30">
              CRM
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Consolidated record of all storefront visitors who have made a purchase. Tap into a customer profile for deep order history and contact details.
          </p>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed bg-muted/20">
          <h3 className="text-lg font-semibold mb-1">No Customers Yet</h3>
          <p className="text-sm text-muted-foreground">
            Customer profiles will be generated automatically once live orders start coming in.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-5 py-3.5 font-semibold text-muted-foreground tracking-wide text-xs uppercase">Name</th>
                <th className="px-5 py-3.5 font-semibold text-muted-foreground tracking-wide text-xs uppercase">Contact Info</th>
                <th className="px-5 py-3.5 font-semibold text-muted-foreground tracking-wide text-xs uppercase w-[150px]">LTV Metrics</th>
                <th className="px-5 py-3.5 font-semibold text-muted-foreground tracking-wide text-xs uppercase w-[200px]">Latest Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((c) => (
                <tr key={c.key} className="group hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 align-middle font-medium">
                    <Link
                      href={`/admin/customers/${encodeURIComponent(c.key)}`}
                      className="text-foreground hover:text-primary transition-colors font-semibold"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="flex flex-col space-y-1">
                      {c.email ? (
                        <Link
                          href={`mailto:${c.email}`}
                          className="text-sm text-foreground/80 hover:text-primary transition-colors hover:underline"
                        >
                          {c.email}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs italic">No email</span>
                      )}
                      {c.phone && (
                         <span className="text-xs text-muted-foreground font-mono">{c.phone}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border/50 text-foreground/90 font-medium text-xs">
                      {c.orderCount} {c.orderCount === 1 ? 'Order' : 'Orders'}
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <Link
                      href={`/admin/orders/${encodeURIComponent(c.lastOrderId)}`}
                      className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors group-hover:underline"
                    >
                      #{c.lastOrderId.slice(0, 8)}...
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
