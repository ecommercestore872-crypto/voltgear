import type { NewsletterSubscriber } from "@/lib/db/newsletter-store";

export function NewsletterList({ subscribers }: { subscribers: NewsletterSubscriber[] }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Newsletter</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Emails collected from the storefront footer. These are not sent automatically.
          </p>
        </div>
        {subscribers.length > 0 ? (
          <a
            href="/api/admin/newsletter?format=csv"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
          >
            Download CSV
          </a>
        ) : null}
      </div>
      {subscribers.length === 0 ? (
        <p className="rounded-md border bg-white px-4 py-8 text-sm text-muted-foreground">
          No subscribers yet. A signup only appears here after the newsletter table exists and
          someone submits the footer form.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{row.email}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.source}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString("en-PK") : "—"}
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
