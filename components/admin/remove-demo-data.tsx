"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";

export function RemoveDemoData() {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onRemove() {
    if (
      !confirm(
        "Delete all demo products, pages, testimonials, reviews, and orders? Live catalog and live orders stay. Hero and settings are not touched.",
      )
    ) {
      return;
    }
    setWorking(true);
    setMessage(null);
    try {
      const json = await adminFetch("/api/admin/demo", { method: "DELETE" });
      setMessage(json.empty ? "No demo data" : "Demo data removed.");
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setMessage(
        err instanceof Error ? err.message : "Could not remove demo data.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed p-4">
      <p className="text-sm font-medium">Demo data</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Wipes only rows tagged demo. Live products, live orders, hero, and
        settings stay.
      </p>
      <Button
        type="button"
        variant="destructive"
        className="mt-3"
        disabled={working}
        onClick={onRemove}
      >
        {working ? "Removing…" : "Remove demo data"}
      </Button>
      {message ? (
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
