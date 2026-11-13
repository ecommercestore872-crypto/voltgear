"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function DeleteOrderButton({
  orderId,
  status,
  onDeleted,
  compact = false,
}: {
  orderId: string;
  isDemo: boolean;
  status: string;
  onDeleted: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setOpen(false);
    setError(null);
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // The signed admin API verifies the exact order ID and origin. Keep the
      // database's sensitive-operation guard, but require just one UI confirmation.
      await adminFetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "DELETE",
        body: JSON.stringify({
          confirmation: orderId,
          sensitiveConfirmation: "DELETE ORDER",
        }),
      });
      setOpen(false);
      onDeleted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={compact ? "outline" : "destructive"}
        className={compact ? "min-h-11 w-full text-destructive border-destructive/40 sm:w-auto" : "min-h-11"}
        onClick={() => { setError(null); setOpen(true); }}
        aria-label={`Delete order ${orderId}`}
      >
        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
        Delete Order
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); else setOpen(true); }}>
        <DialogContent className="max-w-md" role="alertdialog">
          <DialogTitle className="pr-10 text-destructive">Permanently delete order {orderId}?</DialogTitle>
          <p className="mt-3 text-sm text-foreground">
            This removes the order from your admin lists and cannot be undone.
            Required financial, courier and deletion-audit evidence may be retained securely.
          </p>
          {status === "shipped" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              An active shipment cannot be deleted until it is delivered or its cancellation is confirmed.
            </p>
          ) : status === "delivered" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Deleting a delivered order does not restore sold stock, reverse payment or cancel its courier history.
            </p>
          ) : null}
          {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="min-h-11" onClick={close} disabled={busy}>Cancel</Button>
            <Button type="button" variant="destructive" className="min-h-11" onClick={submit} disabled={busy}>
              {busy ? "Deleting…" : "Yes, delete permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
