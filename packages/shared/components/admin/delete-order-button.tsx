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
  onDeleted,
  compact = false,
}: {
  orderId: string;
  isDemo: boolean;
  onDeleted: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const inputId = useId();

  function close() {
    if (busy) return;
    setOpen(false);
    setConfirmation("");
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmation !== orderId) return;
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmation }),
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
            This will permanently delete the order and cannot be undone.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isDemo
              ? "Only eligible practice orders can be deleted. Reserved inventory will be restored."
              : "Live orders are retained. If deletion is blocked, use an approved archive or anonymization process."}
          </p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor={inputId}>Type the exact order ID to confirm: {orderId}</Label>
              <Input id={inputId} autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="min-h-11" onClick={close} disabled={busy}>Cancel</Button>
              <Button type="submit" variant="destructive" className="min-h-11" disabled={busy || confirmation !== orderId}>
                {busy ? "Deleting…" : "Permanently delete"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
