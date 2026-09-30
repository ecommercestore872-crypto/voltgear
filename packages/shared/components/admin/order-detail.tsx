"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Printer, Truck } from "lucide-react";

import { useUnsavedChangesGuard } from "@/components/admin/use-unsaved-changes-guard";

import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ORDER_STATUS_VALUES,
  orderEmailIssueFromHistory,
} from "@/lib/db/order-rules";
import type { Order, OrderStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function OrderDetail({
  order,
}: {
  order: Order & { postex_tracking_number?: string };
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(order.status ?? "new");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [bookingPostEx, setBookingPostEx] = useState(false);
  const [syncingPostEx, setSyncingPostEx] = useState(false);
  const [checkingPostEx, setCheckingPostEx] = useState(false);
  const [reconcilingPostEx, setReconcilingPostEx] = useState(false);
  const [cancellingPostEx, setCancellingPostEx] = useState(false);
  const [postExHint, setPostExHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    setStatus(order.status ?? "new");
  }, [order.status, order.statusUpdatedAt]);

  const orderDirty = useMemo(
    () =>
      status !== (order.status ?? "new") || note.trim().length > 0,
    [status, order.status, note],
  );
  useUnsavedChangesGuard(orderDirty);

  const customer = order.customer ?? {};
  const history = order.statusHistory ?? [];
  const emailIssue = orderEmailIssueFromHistory(history);
  const postexTracking =
    order.postexTrackingNumber?.trim() ||
    (typeof order.postex_tracking_number === "string"
      ? order.postex_tracking_number.trim()
      : "");

  const postExBusy =
    bookingPostEx ||
    syncingPostEx ||
    checkingPostEx ||
    reconcilingPostEx ||
    cancellingPostEx;

  async function handleCheckPostExReady() {
    setCheckingPostEx(true);
    setError(null);
    setPostExHint(null);
    try {
      const data = (await adminFetch(
        `/api/admin/postex/order-payload/${encodeURIComponent(order.orderId)}`,
      )) as { success?: boolean; error?: string; missingOrInvalid?: string[] };
      if (data.success) {
        setPostExHint("Order passes PostEx validation (dry run). Safe to book.");
      } else if (data.missingOrInvalid?.length) {
        setPostExHint(
          `Not ready: ${data.missingOrInvalid.join("; ")}.`,
        );
      } else {
        setPostExHint(data.error ?? "PostEx dry run failed.");
      }
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "PostEx validation failed.",
      );
    } finally {
      setCheckingPostEx(false);
    }
  }

  async function handleBookPostEx() {
    if (postexTracking) return;
    setBookingPostEx(true);
    setError(null);
    setOk(null);
    setPostExHint(null);
    try {
      const data = (await adminFetch("/api/admin/postex/book", {
        method: "POST",
        body: JSON.stringify({ orderId: order.orderId }),
      })) as { trackingNumber?: string; message?: string };
      setOk(
        data.message ??
          `PostEx booked! Tracking #: ${data.trackingNumber ?? "—"}`,
      );
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Could not book PostEx shipment.",
      );
    } finally {
      setBookingPostEx(false);
    }
  }

  async function handleSyncPostExStatus() {
    if (!postexTracking) return;
    setSyncingPostEx(true);
    setError(null);
    setOk(null);
    try {
      const data = (await adminFetch(
        `/api/admin/postex/sync-status/${encodeURIComponent(order.orderId)}`,
        { method: "POST" },
      )) as {
        success?: boolean;
        message?: string;
        error?: string;
        applied?: boolean;
      };
      if (data.success) {
        const dates = [
          data.transactionDate ? `Created ${data.transactionDate}` : null,
          data.orderPickupDate ? `Pickup ${data.orderPickupDate}` : null,
          data.orderDeliveryDate ? `Delivery ${data.orderDeliveryDate}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const base = data.message ?? "PostEx status synced.";
        setOk(dates ? `${base} (${dates})` : base);
        router.refresh();
      } else {
        setError(data.error ?? "PostEx sync failed.");
      }
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "PostEx sync failed.",
      );
    } finally {
      setSyncingPostEx(false);
    }
  }

  async function handleCancelPostEx() {
    if (!postexTracking) return;
    const confirmed = window.confirm(
      "Cancel this shipment on PostEx? Use this only before pickup. You may still cancel the shop order separately.",
    );
    if (!confirmed) return;

    setCancellingPostEx(true);
    setError(null);
    setOk(null);
    try {
      const data = (await adminFetch(
        `/api/admin/postex/cancel/${encodeURIComponent(order.orderId)}`,
        { method: "PUT" },
      )) as { message?: string; error?: string };
      setOk(data.message ?? "PostEx shipment cancelled.");
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "PostEx cancel failed.",
      );
    } finally {
      setCancellingPostEx(false);
    }
  }

  async function handleReconcilePostEx() {
    setReconcilingPostEx(true);
    setError(null);
    setPostExHint(null);
    try {
      const data = (await adminFetch(
        `/api/admin/postex/reconcile/${encodeURIComponent(order.orderId)}`,
      )) as {
        foundInPostEx?: boolean;
        postexOrder?: { trackingNumber?: string | null; transactionStatus?: string | null };
        dbState?: { postexBookingClaimedAt?: string | null };
        error?: string;
      };
      if (data.error) {
        setPostExHint(data.error);
        return;
      }
      if (data.dbState?.postexBookingClaimedAt && !postexTracking) {
        setPostExHint(
          `Booking lock active since ${formatDate(data.dbState.postexBookingClaimedAt)}. Reconcile with PostEx before retrying book.`,
        );
      }
      if (data.foundInPostEx && data.postexOrder) {
        const tn = data.postexOrder.trackingNumber ?? "—";
        const st = data.postexOrder.transactionStatus ?? "unknown";
        setPostExHint(
          `PostEx has this order ref: tracking ${tn}, status “${st}”.`,
        );
      } else if (!data.foundInPostEx) {
        setPostExHint(
          "No matching orderRef in PostEx list for this date window. If book failed mid-flight, contact PostEx support with the order id.",
        );
      }
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "PostEx reconcile failed.",
      );
    } finally {
      setReconcilingPostEx(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "cancelled" && order.status !== "cancelled") {
      const okCancel = window.confirm(
        "Cancel this order? Inventory will be restored and the customer may get a cancellation email.",
      );
      if (!okCancel) return;
    }
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await adminFetch(
        `/api/admin/orders/${encodeURIComponent(order.orderId)}/status`,
        {
          method: "POST",
          body: JSON.stringify({
            status,
            note: note.trim() || undefined,
          }),
        },
      );
      setNote("");
      setOk("Status updated.");
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Could not update the order.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this order? This action cannot be undone.",
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminFetch(
        `/api/admin/orders/${encodeURIComponent(order.orderId)}`,
        {
          method: "DELETE",
        },
      );
      router.push("/admin/orders");
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Could not delete the order.",
      );
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-4">
        <Link
          href="/admin/orders"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
        >
          &larr; Back to Orders
        </Link>
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              Order <span className="tabular-nums font-mono text-blue-600 dark:text-blue-400">{order.orderId}</span>
              {order.isDemo ? (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                  Demo
                </Badge>
              ) : null}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Resolve fulfillment checkpoints, review comprehensive customer details, and modify the shipment lifecycle here. Manage this specific order’s ledger directly to ensure seamless last-mile delivery and accurate accounting.
            </p>
            <p className="text-xs font-semibold text-muted-foreground mt-2">
              Placed {formatDate(order.createdAt)} 
              {order.statusUpdatedAt && ` • Line updated ${formatDate(order.statusUpdatedAt)}`}
            </p>
            {postexTracking ? (
              <p className="text-xs font-mono mt-1 text-blue-700 dark:text-blue-300">
                PostEx tracking: {postexTracking}
              </p>
            ) : null}
          </div>

          {/* PostEx Dispatch Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 flex-wrap">
            <Button asChild type="button" variant="outline" className="shadow-sm">
              <Link
                href={`/order/${encodeURIComponent(order.orderId)}/invoice?print=1&email=${encodeURIComponent(customer.email || '')}`}
                target="_blank"
                rel="noreferrer"
              >
                Download Invoice
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={postExBusy || Boolean(postexTracking)}
              onClick={() => void handleCheckPostExReady()}
              className="shadow-sm"
            >
              {checkingPostEx ? "Validating…" : "Validate for PostEx"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={postExBusy || Boolean(postexTracking)}
              onClick={() => void handleBookPostEx()}
              className="inline-flex items-center gap-1.5 shadow-sm border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 dark:border-blue-900 dark:text-blue-300 dark:bg-blue-950/30 dark:hover:bg-blue-900/50"
            >
              <Truck className="h-4 w-4" />
              {bookingPostEx ? "Pushing to PostEx…" : "Book with PostEx"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={postExBusy || !postexTracking}
              onClick={() => void handleSyncPostExStatus()}
              className="shadow-sm"
            >
              {syncingPostEx ? "Syncing…" : "Sync status from PostEx"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={postExBusy || !postexTracking || status === "delivered"}
              onClick={() => void handleCancelPostEx()}
              className="shadow-sm text-destructive border-destructive/30"
            >
              {cancellingPostEx ? "Cancelling…" : "Cancel on PostEx"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={postExBusy}
              onClick={() => void handleReconcilePostEx()}
              className="shadow-sm text-xs"
            >
              {reconcilingPostEx ? "Reconciling…" : "Reconcile with PostEx"}
            </Button>
            <Button
              asChild
              type="button"
              variant="outline"
              disabled={!postexTracking}
              className="inline-flex items-center gap-1.5 shadow-sm"
            >
              <Link
                href={`/api/admin/postex/airway-bill/${encodeURIComponent(order.orderId)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Printer className="h-4 w-4" />
                Print PostEx Airway Bill
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {postExHint ? (
        <p className="rounded-md border border-blue-200 bg-blue-50/80 px-3 py-2 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          {postExHint}
        </p>
      ) : null}

      {emailIssue ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {emailIssue} The order was still saved. Send the customer a message
          from Messaging if needed.
        </p>
      ) : null}

      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Customer</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd>{customer.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{customer.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{customer.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">City</dt>
            <dd>{customer.city || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Address</dt>
            <dd>{customer.address || "—"}</dd>
          </div>
          {customer.postal ? (
            <div>
              <dt className="text-muted-foreground">Postal</dt>
              <dd>{customer.postal}</dd>
            </div>
          ) : null}
          {customer.note ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground font-semibold">
                Order Note
              </dt>
              <dd className="rounded-md bg-muted/50 p-3 mt-1 text-sm border">
                {customer.note}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Items</h2>
        <ul className="mt-3 divide-y">
          {(order.items ?? []).map((item, i) => (
            <li
              key={`${item.name}-${i}`}
              className="flex items-center justify-between gap-4 py-2 text-sm"
            >
              <span>
                {item.name}
                {item.variantName ? (
                  <span className="text-muted-foreground">
                    {" "}
                    — {item.variantName}
                  </span>
                ) : null}
                <span className="ml-2 text-muted-foreground">
                  × {item.quantity ?? 1}
                </span>
              </span>
              <span className="font-medium">
                {formatPrice((item.price ?? 0) * (item.quantity ?? 1))}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <dt>Subtotal</dt>
            <dd>{formatPrice(order.subtotal ?? 0)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Shipping</dt>
            <dd>
              {(order.shipping ?? 0) > 0
                ? formatPrice(order.shipping ?? 0)
                : "Free"}
            </dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatPrice(order.total ?? 0)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Payment</dt>
            <dd>
              {order.payment === "cod" || !order.payment
                ? "Cash on delivery"
                : order.payment}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Timeline</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No status updates yet.
          </p>
        ) : (
          <ol className="mt-3 space-y-3">
            {history.map((h, i) => (
              <li key={`${h.status}-${h.at}-${i}`} className="text-sm">
                <p className="font-medium mb-1">
                  <StatusBadge status={h.status} />
                </p>
                {h.note ? (
                  <p className="text-muted-foreground">{h.note}</p>
                ) : null}
                {h.at ? (
                  <p className="text-xs text-muted-foreground">
                    {formatDate(h.at)}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <form onSubmit={submit} className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Update status</h2>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
          >
            {ORDER_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tracking number, courier, reason…"
            rows={3}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {ok ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{ok}</p>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Updating…" : "Update"}
        </Button>
      </form>

      <section className="rounded-lg border border-destructive/20 p-4">
        <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete this order. This action cannot be undone.
        </p>
        <Button
          type="button"
          variant="destructive"
          className="mt-4"
          disabled={saving}
          onClick={handleDelete}
        >
          Delete Order
        </Button>
      </section>
    </div>
  );
}
