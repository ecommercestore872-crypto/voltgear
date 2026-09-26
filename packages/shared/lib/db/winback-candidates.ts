import { getServiceClient } from "@/lib/supabase/server";

import {
  WINBACK_MAX_QUEUE_PER_CRON,
  isEligibleWinbackEmail,
} from "./flows-winback-rules";

export type WinbackCandidate = {
  email: string;
  name: string;
};

function isMissingRollupView(error: { code?: string; message?: string } | null): boolean {
  const msg = error?.message ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /admin_customer_rollups|could not find the table|schema cache/i.test(msg)
  );
}

/**
 * Customers whose last order is before `lastOrderBeforeIso`, with a valid email.
 * Uses `admin_customer_rollups` (one row per customer, not O(orders)).
 */
export async function listWinbackCandidates(
  lastOrderBeforeIso: string,
  limit = WINBACK_MAX_QUEUE_PER_CRON,
): Promise<WinbackCandidate[]> {
  const cap = Math.max(1, Math.min(limit, WINBACK_MAX_QUEUE_PER_CRON));

  const { data, error } = await getServiceClient({ admin: true })
    .from("admin_customer_rollups")
    .select("email, name, last_order_at")
    .lt("last_order_at", lastOrderBeforeIso)
    .order("last_order_at", { ascending: true })
    .limit(cap * 3);

  if (error) {
    if (isMissingRollupView(error)) {
      console.warn(
        "[flows] admin_customer_rollups missing — skip win-back sweep until db push",
      );
      return [];
    }
    console.error("[flows] listWinbackCandidates failed:", error);
    return [];
  }

  const out: WinbackCandidate[] = [];
  for (const row of data ?? []) {
    const email = String(row.email ?? "").trim();
    if (!isEligibleWinbackEmail(email)) continue;
    out.push({
      email,
      name: String(row.name ?? "").trim() || "there",
    });
    if (out.length >= cap) break;
  }
  return out;
}
