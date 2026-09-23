"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";

type Submission = {
  id: string;
  name?: string;
  email?: string;
  rating?: number;
  comment?: string;
  reply?: string;
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
  const [replies, setReplies] = useState<Record<string, string>>({});

  async function act(id: string, action: "approve" | "reject") {
    setBusy(id + action);
    setError(null);
    try {
      const reply = replies[id];
      await adminFetch("/api/admin/reviews", {
        method: "PATCH",
        body: JSON.stringify({ id, action, reply }),
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
    if (
      !confirm(
        "Permanently delete this review submission? This cannot be undone.",
      )
    )
      return;
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
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      {/* Command Center Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Customer Reviews
            </h1>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500/30">
              Moderation Queue
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Monitor and moderate incoming product feedback. Approve glowing reviews to boost conversion, or remove inappropriate content before it hits the storefront.
          </p>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      ) : null}

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed bg-muted/20">
          <h3 className="text-lg font-semibold mb-1">Inbox Zero</h3>
          <p className="text-sm text-muted-foreground">
            There are no pending reviews in the queue right now.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reviews.map((r) => (
            <div 
              key={r.id} 
              className="flex flex-col sm:flex-row gap-5 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/40 relative overflow-hidden"
            >
              {/* Colored left accent line based on status */}
              <div 
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  r.status === "approved" ? "bg-emerald-500" :
                  r.status === "rejected" ? "bg-rose-500" :
                  "bg-amber-400"
                }`}
              />
              
              <div className="flex-1 min-w-0 pl-2">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-base text-foreground">
                      {r.name || "Anonymous Shopper"}
                    </h3>
                    <div className="flex items-center gap-0.5">
                      {/* Convert numerical rating to visual stars pseudo-element */}
                      <span className="text-sm font-bold text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        ★ {r.rating ?? "—"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  {r.status === "approved" ? (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30">
                      Approved
                    </span>
                  ) : r.status === "rejected" ? (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-rose-500/10 to-red-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30">
                      Rejected
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30">
                      Pending Action
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap text-[13px] font-medium text-muted-foreground items-center gap-2 mb-3">
                  <span className="bg-muted px-2 py-0.5 rounded text-foreground/80">
                    {r.product_name || "Unknown Product"}
                  </span>
                  {r.email && <span className="opacity-70">{r.email}</span>}
                  <span className="opacity-40">•</span>
                  <span className="opacity-70">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
                
                <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-sm text-foreground/90 leading-relaxed max-w-3xl">
                  {r.comment ? `"${r.comment}"` : <span className="italic text-muted-foreground/60">No written feedback provided.</span>}
                </div>
                
                {r.status === "pending" || r.reply ? (
                  <div className="mt-3">
                    <Textarea
                      placeholder={r.status === "pending" ? "Write a public reply (optional)..." : "Store Reply"}
                      value={replies[r.id] ?? r.reply ?? ""}
                      onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })}
                      disabled={r.status !== "pending"}
                      className="min-h-[80px] text-sm resize-none bg-background shadow-none"
                    />
                  </div>
                ) : null}
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col shrink-0 gap-2 items-center sm:items-stretch sm:justify-center border-t sm:border-t-0 sm:border-l border-border/60 pt-4 sm:pt-0 sm:pl-5">
                {r.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white w-full shadow-sm shadow-emerald-900/20"
                      disabled={busy === r.id + "approve"}
                      onClick={() => act(r.id, "approve")}
                    >
                      {busy === r.id + "approve" ? "..." : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                      disabled={busy === r.id + "reject"}
                      onClick={() => act(r.id, "reject")}
                    >
                      {busy === r.id + "reject" ? "..." : "Reject"}
                    </Button>
                  </>
                )}
                {r.status !== "pending" && (
                   <div className="text-xs text-center font-medium text-muted-foreground w-full py-1">
                     Already resolved
                   </div>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  disabled={busy === r.id + "delete"}
                  onClick={() => remove(r.id)}
                >
                  Delete record
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
