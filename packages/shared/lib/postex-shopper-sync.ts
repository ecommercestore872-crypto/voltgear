import { resolveAdminUpstreamBaseUrl } from "@/lib/deploy-rules";
import { getOrderByPublicId, updateOrderStatusRow } from "@/lib/db/store";
import { runPostExStatusSyncForOrderId } from "@/lib/postex-status-sync";

const lastSyncAt = new Map<string, number>();
const MIN_INTERVAL_MS = 60_000;

function postExConfiguredLocally(): boolean {
  return Boolean(process.env.POSTEX_API_TOKEN?.trim());
}

function postExSyncDeps() {
  return {
    getOrder: getOrderByPublicId,
    applyStatusUpdate: async (
      id: string,
      newStatus: Parameters<typeof updateOrderStatusRow>[1],
      note: string,
    ) => {
      const updated = await updateOrderStatusRow(id, newStatus, note);
      if (!updated) {
        return { ok: false as const, error: "Could not update order status." };
      }
      return { ok: true as const };
    },
  };
}

async function syncViaAdminUpstream(orderId: string): Promise<void> {
  const adminBase = resolveAdminUpstreamBaseUrl();
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!adminBase || !cronSecret) return;

  const url = `${adminBase}/api/internal/postex/sync/${encodeURIComponent(orderId)}`;
  await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cronSecret}` },
    signal: AbortSignal.timeout(15_000),
  }).catch(() => undefined);
}

/** Pull latest PostEx status into our order row (throttled per order). */
export async function refreshOrderStatusFromPostExIfDue(
  orderId: string,
): Promise<void> {
  const trimmed = orderId?.trim();
  if (!trimmed) return;
  if (!postExConfiguredLocally() && !resolveAdminUpstreamBaseUrl()) return;

  const now = Date.now();
  const last = lastSyncAt.get(trimmed) ?? 0;
  if (now - last < MIN_INTERVAL_MS) return;
  lastSyncAt.set(trimmed, now);

  if (postExConfiguredLocally()) {
    await runPostExStatusSyncForOrderId(trimmed, postExSyncDeps());
    return;
  }

  await syncViaAdminUpstream(trimmed);
}

export async function syncPostExOrdersBatch(orderIds: string[]): Promise<{
  synced: number;
  failed: number;
}> {
  let synced = 0;
  let failed = 0;
  for (const id of orderIds) {
    lastSyncAt.delete(id.trim());
    try {
      const result = await runPostExStatusSyncForOrderId(id.trim(), {
        getOrder: getOrderByPublicId,
        applyStatusUpdate: async (oid, newStatus, note) => {
          const updated = await updateOrderStatusRow(oid, newStatus, note);
          if (!updated) {
            return { ok: false, error: "Could not update order status." };
          }
          return { ok: true };
        },
      });
      if (result.status >= 200 && result.status < 300) synced += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { synced, failed };
}
