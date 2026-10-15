import { revalidateShopMerchandising } from "@/lib/revalidate-storefront";
import { getServiceClient } from "@/lib/supabase/server";

function db() {
  return getServiceClient({ admin: true });
}

export type DemoPurgeResult = {
  ok: true;
  empty: boolean;
  deleted: {
    review_submissions: number;
    reviews: number;
    orders: number;
    email_events: number;
    contact_submissions: number;
    testimonials: number;
    pages: number;
    products: number;
  };
};

export async function purgeDemoData(): Promise<DemoPurgeResult> {
  const { data, error } = await db().rpc("admin_purge_demo_data");
  if (error || !data?.ok || !data.deleted) {
    console.error("[demo] admin_purge_demo_data failed:", error);
    throw new Error("Could not purge practice data atomically.");
  }
  const raw = data.deleted as Record<string, unknown>;
  const deleted = {
    review_submissions: Number(raw.review_submissions ?? 0),
    reviews: Number(raw.reviews ?? 0),
    orders: Number(raw.orders ?? 0),
    email_events: Number(raw.email_events ?? 0),
    contact_submissions: Number(raw.contact_submissions ?? 0),
    testimonials: Number(raw.testimonials ?? 0),
    pages: Number(raw.pages ?? 0),
    products: Number(raw.products ?? 0),
  };
  void revalidateShopMerchandising(
    "/",
    "/products",
    "/search",
    "/blog",
    "/admin",
    "/admin/orders",
    "/admin/products",
    "/admin/pages",
    "/admin/testimonials",
    "/admin/reviews"
  );
  return {
    ok: true,
    empty: Object.values(deleted).every((count) => count === 0),
    deleted,
  };
}
