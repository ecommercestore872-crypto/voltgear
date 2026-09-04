"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import type { AutopilotConfig } from "@/lib/autopilot/config";

export function AutopilotEnginePanel({
  config,
  postExReady,
  readyCount,
  hold,
}: {
  config: AutopilotConfig;
  postExReady: boolean;
  readyCount: number;
  hold: { orderId: string; reason: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoDispatch, setAutoDispatch] = useState(config.autoDispatch);
  const [autoRescue, setAutoRescue] = useState(config.autoRescue);

  async function save(next: AutopilotConfig) {
    setBusy("save");
    setError(null);
    try {
      await adminFetch("/api/admin/autopilot", {
        method: "PATCH",
        body: JSON.stringify(next),
      });
      setAutoDispatch(next.autoDispatch);
      setAutoRescue(next.autoRescue);
      setLog("Saved.");
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function run(action: "dispatch" | "rescue") {
    setBusy(action);
    setError(null);
    setLog(null);
    try {
      const data = (await adminFetch("/api/admin/autopilot", {
        method: "POST",
        body: JSON.stringify({ action }),
      })) as { results?: { orderId: string; ok: boolean; reason: string }[] };
      const rows = data.results ?? [];
      setLog(
        rows.length
          ? rows.map((r) => `${r.orderId}: ${r.ok ? r.reason : `failed — ${r.reason}`}`).join("\n")
          : "Nothing to run."
      );
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setBusy(null);
    }
  }

  async function uploadCsv(file?: File) {
    if (!file) return;
    setBusy("settle");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const data = (await adminFetch("/api/admin/autopilot", {
        method: "POST",
        body: form,
      })) as { status?: string; totalParcels?: number; items?: { trackingNumber: string; status: string }[] };
      setLog(
        `${data.status ?? "done"} · ${data.totalParcels ?? 0} rows\n${(data.items ?? [])
          .slice(0, 12)
          .map((i) => `${i.trackingNumber} ${i.status}`)
          .join("\n")}`
      );
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {!postExReady ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Set <code>POSTEX_API_TOKEN</code> before auto-book or tracking refresh will work.
        </p>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={autoDispatch}
          disabled={busy !== null}
          onChange={(e) => save({ autoDispatch: e.target.checked, autoRescue })}
        />
        Auto-book ready orders (checkout + daily cron)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={autoRescue}
          disabled={busy !== null}
          onChange={(e) => save({ autoDispatch, autoRescue: e.target.checked })}
        />
        Auto-refresh PostEx tracking (daily cron) and mark delivered when the courier says so
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => run("dispatch")} disabled={busy !== null}>
          Book {readyCount} ready now
        </Button>
        <Button type="button" variant="outline" onClick={() => run("rescue")} disabled={busy !== null}>
          Refresh tracking
        </Button>
        <label className="inline-flex cursor-pointer items-center text-sm underline underline-offset-2">
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => uploadCsv(e.target.files?.[0])}
          />
          Upload payout CSV
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        CSV columns: tracking, collected, fee. Compared to your orders that already have a tracking
        number.
      </p>
      {hold.length ? (
        <div className="space-y-1 text-sm">
          <p className="font-medium">Need you before booking</p>
          {hold.slice(0, 8).map((h) => (
            <p key={h.orderId} className="text-muted-foreground">
              {h.orderId}: {h.reason}
            </p>
          ))}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {log ? <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">{log}</pre> : null}
    </div>
  );
}
