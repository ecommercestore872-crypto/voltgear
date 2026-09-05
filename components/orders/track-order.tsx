"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SHOPPER_NOT_FOUND_MESSAGE } from "@/lib/db/order-rules";
import type { OrderStatus } from "@/lib/types";

interface HistoryEntry {
  status: string;
  note?: string;
  at?: string;
}

interface TrackResponse {
  orderId: string;
  status: OrderStatus;
  statusUpdatedAt: string | null;
  statusHistory: HistoryEntry[];
  createdAt: string | null;
  items: {
    name: string;
    price: number;
    quantity: number;
    variantName?: string;
  }[];
  subtotal: number;
  shipping: number;
  total: number;
  payment: string;
  cancellable: boolean;
  cancelUntil: string | null;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Order placed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PIPELINE: OrderStatus[] = ["new", "processing", "shipped", "delivered"];

type StepState = "complete" | "current" | "upcoming";

type TimelineStep = {
  key: OrderStatus;
  label: string;
  state: StepState;
  note?: string;
  at?: string | null;
};

function lastHistory(history: HistoryEntry[], status: OrderStatus): HistoryEntry | undefined {
  const matches = history.filter((h) => h.status === status);
  return matches[matches.length - 1];
}

function buildTimeline(result: TrackResponse): TimelineStep[] {
  const history = result.statusHistory ?? [];
  if (result.status === "cancelled") {
    const placed = lastHistory(history, "new");
    const cancelled = lastHistory(history, "cancelled");
    return [
      {
        key: "new",
        label: STATUS_LABEL.new,
        state: "complete",
        note: placed?.note,
        at: placed?.at ?? result.createdAt,
      },
      {
        key: "cancelled",
        label: STATUS_LABEL.cancelled,
        state: "current",
        note: cancelled?.note,
        at: cancelled?.at ?? result.statusUpdatedAt,
      },
    ];
  }

  const currentIdx = Math.max(0, PIPELINE.indexOf(result.status));
  return PIPELINE.map((status, i) => {
    const entry = lastHistory(history, status);
    const reached = i <= currentIdx;
    let at = entry?.at;
    if (status === "new") at = at ?? result.createdAt ?? undefined;
    else if (i === currentIdx) at = at ?? result.statusUpdatedAt ?? undefined;
    return {
      key: status,
      label: STATUS_LABEL[status],
      state: (i < currentIdx ? "complete" : i === currentIdx ? "current" : "upcoming") as StepState,
      note: reached ? entry?.note : undefined,
      at: reached ? at : undefined,
    };
  });
}

function formatPrice(n: number): string {
  return `Rs ${n.toLocaleString("en-PK")}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResponse | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function search(o: string, e: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    setConfirmCancel(false);
    setCancelError(null);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(o.trim())}?email=${encodeURIComponent(e.trim())}`
      );
      if (res.status === 404) {
        setError(SHOPPER_NOT_FOUND_MESSAGE);
        return;
      }
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.orderId) {
        setError("Something went wrong. Try again.");
        return;
      }
      setResult(body);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelOrder() {
    if (!result) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(result.orderId)}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        }
      );
      const body = await res.json().catch(() => null);
      if (res.status === 404) {
        setCancelError(SHOPPER_NOT_FOUND_MESSAGE);
        return;
      }
      if (!res.ok || !body?.order) {
        setCancelError(
          typeof body?.error === "string"
            ? body.error
            : "Could not cancel. Try again."
        );
        if (body?.order) setResult(body.order);
        return;
      }
      setResult(body.order);
      setConfirmCancel(false);
    } catch {
      setCancelError("Could not cancel. Try again.");
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const o = params.get("orderId") ?? "";
    const e = params.get("email") ?? "";
    if (o && e) {
      setOrderId(o);
      setEmail(e);
      search(o, e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = result ? buildTimeline(result) : [];

  return (
    <div className="space-y-8">
      <div className="min-w-0 rounded-2xl border border-border/50 bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] sm:p-6 lg:p-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(orderId, email);
          }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="orderId" className="text-sm font-bold text-slate-800">Order number</Label>
            <Input
              id="orderId"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              required
              autoComplete="off"
              placeholder="e.g. VG-1042"
              className="h-12 rounded-xl bg-slate-50/50"
            />
            <p className="text-[13px] text-muted-foreground/80">
              Enter the order number from your confirmation email
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-bold text-slate-800">Email used at checkout</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 rounded-xl bg-slate-50/50"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto h-12 rounded-xl px-8 font-bold text-[15px] tracking-wide">
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Track Order
          </Button>
        </form>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
        >
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="min-w-0 rounded-2xl border border-border/50 bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] sm:p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-3 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between">
               <div className="min-w-0">
                 <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">{result.orderId}</p>
                 <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                   {STATUS_LABEL[result.status]}
                 </h2>
               </div>
               <div className="sm:text-right">
                 <p className="text-[13px] text-muted-foreground">Updated</p>
                 <p className="text-[14px] font-semibold text-slate-900">{formatDate(result.statusUpdatedAt ?? result.createdAt)}</p>
               </div>
            </div>

            <ol className="mt-8">
              {steps.map((step, i) => {
                const isLast = i === steps.length - 1;
                const done = step.state === "complete" || step.state === "current";
                return (
                  <li key={step.key} className="relative flex gap-4 pb-8 last:pb-0">
                    {!isLast && (
                      <span
                        className={`absolute left-[11px] top-6 h-full w-[2px] ${
                          step.state === "complete" ? "bg-primary" : "bg-slate-100"
                        }`}
                      />
                    )}
                    <span
                      className={`mt-1 h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center ${
                        step.state === "current"
                          ? "border-primary bg-primary shadow-[0_0_0_4px_rgba(8,127,140,0.15)]"
                          : step.state === "complete"
                            ? "border-primary bg-primary"
                            : "border-slate-200 bg-white"
                      }`}
                      aria-hidden
                    >
                      {step.state === "complete" && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {step.state === "current" && (
                         <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                    <div className="-mt-0.5">
                      <p
                        className={`text-[15px] font-bold ${
                          step.state === "upcoming" ? "text-slate-400" : "text-slate-900"
                        }`}
                      >
                        {step.label}
                        {step.state === "current" && (
                          <span className="ml-3 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">current</span>
                        )}
                      </p>
                      {done && step.note ? (
                        <p className="mt-1 text-sm text-slate-500 leading-relaxed max-w-lg">{step.note}</p>
                      ) : null}
                      {done && step.at ? (
                        <p className="mt-1 text-[12px] font-medium text-slate-400">{formatDate(step.at)}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>

            {result.cancellable ? (
              <div className="mt-6 border-t border-border pt-5">
                {!confirmCancel ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      You can cancel until{" "}
                      {formatDate(result.cancelUntil)} while we haven&apos;t shipped.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 w-full sm:w-auto"
                      onClick={() => {
                        setCancelError(null);
                        setConfirmCancel(true);
                      }}
                    >
                      Cancel order
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm font-medium text-foreground">
                      Cancel this order? You can&apos;t undo this.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={cancelling}
                        onClick={() => setConfirmCancel(false)}
                      >
                        Keep order
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={cancelling}
                        onClick={() => void cancelOrder()}
                      >
                        {cancelling ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Yes, cancel
                      </Button>
                    </div>
                  </div>
                )}
                {cancelError ? (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {cancelError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="min-w-0 rounded-2xl border border-border/50 bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] sm:p-6 lg:p-8">
            <h3 className="text-lg font-bold tracking-tight text-slate-900">Order Items</h3>
            <ul className="mt-5 divide-y divide-border/40">
              {result.items.map((item, i) => (
                <li
                  key={`${item.name}-${i}`}
                  className="flex items-center justify-between gap-4 py-4 text-sm"
                >
                  <span className="font-medium text-slate-800">
                    {item.name}
                    {item.variantName && (
                      <span className="text-muted-foreground"> — {item.variantName}</span>
                    )}
                    <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-500 text-xs font-bold font-mono">×{item.quantity}</span>
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-2 border-t border-border/40 pt-5 text-sm">
              <div className="flex justify-between text-slate-500 font-medium">
                <dt>Subtotal</dt>
                <dd className="text-slate-900">{formatPrice(result.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-slate-500 font-medium">
                <dt>Shipping</dt>
                <dd className="text-slate-900">{result.shipping > 0 ? formatPrice(result.shipping) : "Free"}</dd>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-2">
                <dt>Total</dt>
                <dd className="text-primary">{formatPrice(result.total)}</dd>
              </div>
              <div className="flex justify-between text-slate-500 mt-4 text-[12px] font-semibold uppercase tracking-wider">
                <dt>Payment Method</dt>
                <dd className="text-slate-700">
                  {result.payment === "cod" ? "Cash on Delivery" : result.payment}
                </dd>
              </div>
            </dl>
          </div>

          <p className="text-[13px] font-medium text-slate-500 text-center">
            Questions about your order?{" "}
            <Link href="/contact" className="font-bold text-primary hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
