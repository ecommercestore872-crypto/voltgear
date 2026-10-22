"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NewsletterSubscriber } from "@/lib/db/newsletter-store";
import { adminFetch } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAdminOrderDate } from "@/lib/admin-date";
import { newsletterListFilters, newsletterListHref, type NewsletterListFilters } from "@/lib/newsletter-pagination-rules";

export function NewsletterList({
  subscribers,
  total,
  pageSize,
  filters,
  loadFailed = false,
}: {
  subscribers: NewsletterSubscriber[];
  total: number;
  pageSize: number;
  filters: NewsletterListFilters;
  loadFailed?: boolean;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [rows, setRows] = useState(subscribers);
  const [query, setQuery] = useState(filters.q);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const routeKey = newsletterListHref(filters);
  useEffect(() => { setRows(subscribers); }, [subscribers]);
  useEffect(() => { setQuery(filters.q); }, [routeKey, filters.q]);

  function navigate(next: Partial<NewsletterListFilters>) {
    const nextFilters = newsletterListFilters({ ...filters, q: query, ...next });
    setQuery(nextFilters.q);
    startNavigation(() => router.push(newsletterListHref(nextFilters)));
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function unsubscribe(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const result = (await adminFetch("/api/admin/newsletter", {
        method: "PATCH",
        body: JSON.stringify({ id, action: "unsubscribe" }),
      })) as { subscriber: NewsletterSubscriber };
      setRows((current) => current.map((row) => row.id === id ? result.subscriber : row));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unsubscribe failed.");
    } finally {
      setBusyId(null);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Newsletter</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Emails collected from the storefront footer. These are not sent
            automatically.
          </p>
        </div>
          <a
            href="/api/admin/newsletter?format=csv"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
          >
            Download all subscribed (CSV)
          </a>
      </div>
      <p className="text-xs text-muted-foreground">CSV includes subscribed addresses across the entire list, regardless of the filters or page below. Subscription changes during the export may affect its contents.</p>
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Subscription status" className="h-9 rounded-md border bg-background px-3 text-sm"
          value={filters.status} disabled={navigating || busyId !== null}
          onChange={(event) => navigate({ status: event.target.value as NewsletterListFilters["status"], page: 1 })}>
          <option value="all">All statuses</option>
          <option value="subscribed">Subscribed</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
        <form className="flex flex-1 min-w-64 gap-2" onSubmit={(event) => { event.preventDefault(); navigate({ page: 1 }); }}>
          <Input aria-label="Search newsletter subscribers" placeholder="Search email or source" maxLength={80}
            value={query} onChange={(event) => setQuery(event.target.value)} disabled={navigating || busyId !== null} />
          <Button type="submit" variant="outline" disabled={navigating || busyId !== null}>Search</Button>
        </form>
      </div>
      {!loadFailed && <p className="text-sm text-muted-foreground" aria-live="polite">{total} subscribers match the current filters. Page {filters.page}.</p>}
      {error ? <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p> : null}
      {loadFailed ? <p className="rounded-md border px-4 py-8 text-sm text-muted-foreground">Subscribers could not be loaded. Retry this page.</p> : rows.length === 0 ? (
        <p className="rounded-md border bg-white px-4 py-8 text-sm text-muted-foreground">
          No subscribers match this page and its filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Joined</th>
                <th className="px-3 py-2 font-medium">Consent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{row.email}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.source}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {row.createdAt
                      ? formatAdminOrderDate(row.createdAt)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {row.status === "subscribed" ? (
                      <Button type="button" size="sm" variant="outline" disabled={busyId !== null || navigating} onClick={() => unsubscribe(row.id)}>
                        Unsubscribe
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">Unsubscribed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">Showing {rows.length} subscribers on this page{loadFailed ? "" : ` of ${total} matching subscribers`}.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={navigating || busyId !== null || filters.page <= 1}
            onClick={() => navigate({ page: filters.page - 1 })}>Previous page</Button>
          <Button type="button" variant="outline" disabled={navigating || busyId !== null || loadFailed || filters.page >= totalPages}
            onClick={() => navigate({ page: filters.page + 1 })}>Next page</Button>
        </div>
      </div>
    </div>
  );
}
