"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";

type Submission = {
  id: string;
  name?: string;
  email?: string;
  rating?: number;
  comment?: string;
  status?: string;
  product_name?: string;
  created_at?: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export function ReviewsQueue({ reviews }: { reviews: Submission[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    setBusy(id + action);
    setError(null);
    try {
      await adminFetch("/api/admin/reviews", {
        method: "PATCH",
        body: JSON.stringify({ id, action }),
      });
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Permanently delete this review submission? This cannot be undone.")) return;
    setBusy(id + "delete");
    setError(null);
    try {
      await adminFetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Review submissions</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
      ) : (
        <ul className="space-y-2">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">
                      {r.name || "Anonymous"} · {r.rating ?? "—"}/5
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        STATUS_COLORS[r.status ?? "pending"] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.status ?? "pending"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.product_name || "Product"} · {r.email}
                    {r.created_at
                      ? " · " + new Date(r.created_at).toLocaleDateString()
                      : ""}
                  </p>
                  <p className="mt-1.5 text-sm text-foreground/80 line-clamp-3">{r.comment}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {r.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        disabled={busy === r.id + "approve"}
                        onClick={() => act(r.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy === r.id + "reject"}
                        onClick={() => act(r.id, "reject")}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy === r.id + "delete"}
                    onClick={() => remove(r.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
