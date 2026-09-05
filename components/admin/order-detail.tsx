"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_STATUS_VALUES, orderEmailIssueFromHistory } from "@/lib/db/order-rules";
import type { Order, OrderStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

import { PostExChitModal } from "@/components/admin/postex-chit-modal";
import { Printer, Truck } from "lucide-react";

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
  const [showChitModal, setShowChitModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    setStatus(order.status ?? "new");
  }, [order.status, order.statusUpdatedAt]);

  const customer = order.customer ?? {};
  const history = order.statusHistory ?? [];
  const emailIssue = orderEmailIssueFromHistory(history);

  async function handleBookPostEx() {
    setBookingPostEx(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/admin/postex/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to book PostEx shipment.");
      }
      setOk(`PostEx booked! Tracking #: ${data.trackingNumber}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not book PostEx shipment.");
    } finally {
      setBookingPostEx(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await adminFetch(`/api/orders/${encodeURIComponent(order.orderId)}/status`, {
        method: "POST",
        body: JSON.stringify({
          status,
          note: note.trim() || undefined,
        }),
      });
      setNote("");
      setOk("Status updated.");
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not update the order.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to permanently delete this order? This action cannot be undone.")) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminFetch(`/api/orders/${encodeURIComponent(order.orderId)}`, {
        method: "DELETE",
      });
      router.push("/admin/orders");
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not delete the order.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-muted-foreground hover:underline">
          ← Orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              Order <span className="tabular-nums">{order.orderId}</span>
              {order.isDemo ? (
                <span className="ml-2 align-middle rounded bg-amber-400 px-1.5 py-0.5 text-xs font-semibold uppercase text-black">
                  Demo
                </span>
              ) : null}
            </h1>
            <p className="text-sm text-muted-foreground">
              Placed {formatDate(order.createdAt)}
              {order.statusUpdatedAt ? ` · Updated ${formatDate(order.statusUpdatedAt)}` : ""}
            </p>
          </div>

          {/* PostEx Dispatch Actions */}
          <div className="flex items-center gap-2">
            <Button asChild type="button" variant="outline">
              <Link
                href={`/order/${encodeURIComponent(order.orderId)}/invoice?print=1`}
                target="_blank"
                rel="noreferrer"
              >
                Download invoice
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={bookingPostEx}
              onClick={handleBookPostEx}
              className="inline-flex items-center gap-1.5 border-[#1F3626] text-[#1F3626] hover:bg-[#1F3626]/10"
            >
              <Truck className="h-4 w-4" />
              {bookingPostEx ? "Booking PostEx…" : "Book with PostEx"}
            </Button>
            <Button
              type="button"
              onClick={() => setShowChitModal(true)}
              className="inline-flex items-center gap-1.5 bg-[#1F3626] text-white hover:bg-[#2a4633]"
            >
              <Printer className="h-4 w-4" />
              Print PostEx Chit
            </Button>
          </div>
        </div>
      </div>

      {showChitModal && (
        <PostExChitModal order={order} onClose={() => setShowChitModal(false)} />
      )}

      {emailIssue ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {emailIssue} The order was still saved. Send the customer a message from Messaging if
          needed.
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
              <dt className="text-muted-foreground font-semibold">Order Note</dt>
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
            <li key={`${item.name}-${i}`} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span>
                {item.name}
                {item.variantName ? (
                  <span className="text-muted-foreground"> — {item.variantName}</span>
                ) : null}
                <span className="ml-2 text-muted-foreground">× {item.quantity ?? 1}</span>
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
            <dd>{(order.shipping ?? 0) > 0 ? formatPrice(order.shipping ?? 0) : "Free"}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatPrice(order.total ?? 0)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Payment</dt>
            <dd>{order.payment === "cod" || !order.payment ? "Cash on delivery" : order.payment}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Timeline</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No status updates yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {history.map((h, i) => (
              <li key={`${h.status}-${h.at}-${i}`} className="text-sm">
                <p className="font-medium">{STATUS_LABEL[h.status] ?? h.status}</p>
                {h.note ? <p className="text-muted-foreground">{h.note}</p> : null}
                {h.at ? <p className="text-xs text-muted-foreground">{formatDate(h.at)}</p> : null}
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
        {ok ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{ok}</p> : null}
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
