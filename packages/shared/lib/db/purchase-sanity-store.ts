import { getServiceClient } from "@/lib/supabase/server";
import type { PurchaseSanityOrderRow } from "@/lib/purchase-sanity-rules";

const PAGE = 500;

/** Lightweight order rows for weekly Purchase vs admin sanity (service role). */
export async function fetchPurchaseSanityOrderRows(): Promise<PurchaseSanityOrderRow[]> {
  const db = getServiceClient({ admin: true });
  const rows: PurchaseSanityOrderRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("orders")
      .select(
        "order_id, created_at, is_demo, total, attrib_ttclid, attrib_fbclid, attrib_source, analytics_session_id",
      )
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("[purchase-sanity] fetch failed:", error.message);
      return rows;
    }
    const batch = data ?? [];
    for (const row of batch) {
      rows.push({
        orderId: String(row.order_id),
        createdAt: String(row.created_at),
        isDemo: Boolean(row.is_demo),
        total: row.total != null ? Number(row.total) : null,
        attrib_ttclid: row.attrib_ttclid ? String(row.attrib_ttclid) : null,
        attrib_fbclid: row.attrib_fbclid ? String(row.attrib_fbclid) : null,
        attrib_source: row.attrib_source ? String(row.attrib_source) : null,
        analytics_session_id: row.analytics_session_id
          ? String(row.analytics_session_id)
          : null,
      });
    }
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}
