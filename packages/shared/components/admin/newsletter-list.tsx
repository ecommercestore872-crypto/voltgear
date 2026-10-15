"use client";

import { useState } from "react";
import type { NewsletterSubscriber } from "@/lib/db/newsletter-store";
import { adminFetch } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";

export function NewsletterList({
  subscribers,
}: {
  subscribers: NewsletterSubscriber[];
}) {
  const [rows, setRows] = useState(subscribers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function unsubscribe(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const result = (await adminFetch("/api/admin/newsletter", {
        method: "PATCH",
        body: JSON.stringify({ id, action: "unsubscribe" }),
      })) as { subscriber: NewsletterSubscriber };
      setRows((current) => current.map((row) => row.id === id ? result.subscriber : row));
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
        {rows.some((row) => row.status === "subscribed") ? (
          <a
            href="/api/admin/newsletter?format=csv"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
          >
            Download CSV
          </a>
        ) : null}
      </div>
      {error ? <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="rounded-md border bg-white px-4 py-8 text-sm text-muted-foreground">
          No subscribers yet. A signup only appears here after the newsletter
          table exists and someone submits the footer form.
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
                      ? new Date(row.createdAt).toLocaleString("en-PK")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {row.status === "subscribed" ? (
                      <Button type="button" size="sm" variant="outline" disabled={busyId === row.id} onClick={() => unsubscribe(row.id)}>
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
    </div>
  );
}
