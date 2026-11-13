"use client";

import { useId, useState } from "react";
import { Trash2 } from "lucide-react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteOrderButton({
  orderId,
  isDemo,
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
  const [confirmation, setConfirmation] = useState("");
  const [sensitiveConfirmation, setSensitiveConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const inputId = useId();
  const sensitiveInputId = useId();
  const needsSensitiveConfirmation = !isDemo || status === "shipped" || status === "delivered";

  function close() {
    if (busy) return;
    setOpen(false);
    setConfirmation("");
    setSensitiveConfirmation("");
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmation !== orderId || (needsSensitiveConfirmation && sensitiveConfirmation !== "DELETE ORDER")) return;
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmation, sensitiveConfirmation }),
      });
      setOpen(false);
      setConfirmation("");
      setSensitiveConfirmation("");
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
        onClick={() => setOpen(true)}
        aria-label={`Delete order ${orderId}`}
      >
        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
        Delete Order
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); else setOpen(true); }}>
        <DialogContent className="max-w-md" role="alertdialog" aria-labelledby={titleId}>
          <DialogTitle id={titleId} className="pr-10 text-destructive">Delete order {orderId}?</DialogTitle>
          <p className="mt-3 text-sm text-foreground">
            This removes the operational order and cannot be undone. A restricted deletion record and audit are retained.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {status === "shipped"
              ? "An active shipment must be delivered or its cancellation confirmed before deletion."
              : status === "delivered"
                ? "Delivered goods are never restocked. Courier and financial evidence is retained."
                : "Eligible orders can be deleted after courier, payment, and reporting checks. Only unfulfilled outstanding inventory reservations are restored."}
          </p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor={inputId}>Type the exact order ID to confirm: {orderId}</Label>
              <Input id={inputId} autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </div>
            {needsSensitiveConfirmation ? <div className="space-y-2">
              <Label htmlFor={sensitiveInputId}>Type DELETE ORDER for the additional confirmation</Label>
              <Input id={sensitiveInputId} autoComplete="off" value={sensitiveConfirmation} onChange={(event) => setSensitiveConfirmation(event.target.value)} />
            </div> : null}
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="min-h-11" onClick={close} disabled={busy}>Cancel</Button>
              <Button type="submit" variant="destructive" className="min-h-11" disabled={busy || confirmation !== orderId || (needsSensitiveConfirmation && sensitiveConfirmation !== "DELETE ORDER")}>
                {busy ? "Deleting…" : "Permanently delete"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
