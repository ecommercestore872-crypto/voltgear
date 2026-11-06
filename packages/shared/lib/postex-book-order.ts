import type { PostExOrderPayload } from "@/lib/postex";
import { toPostExOrderPayloadForApi, type PostExCreateOrderPayload } from "@/lib/postex-order-payload";
import type { Order } from "@/lib/types";

export const POSTEX_BOOKING_CONFLICT_MESSAGE =
  "PostEx booking is already in progress or this order has already been booked.";

export type PostExCreateOrderResult =
  | { ok: true; trackingNumber: string }
  | { ok: false; error: string; failureKind?: "definitive" | "unknown" };

export type PostExBookPayloadResult =
  | { ok: true; payload: PostExCreateOrderPayload }
  | { ok: false; status: number; error: string };

export type PostExBookOrderDeps = {
  getOrder: (orderId: string) => Promise<Order | null>;
  buildPostExPayload: (order: Order) => Promise<PostExBookPayloadResult>;
  claimOrder: (orderId: string, claimedAt: string) => Promise<string | null>;
  releaseClaim: (orderId: string, attemptId: string) => Promise<boolean>;
  markUnknown: (orderId: string, attemptId: string) => Promise<void>;
  completeBooking: (orderId: string, trackingNumber: string, attemptId: string, completedAt: string) =>
    Promise<{ ok: true } | { ok: false; error: string }>;
  createPostExOrder: (payload: PostExOrderPayload) => Promise<PostExCreateOrderResult>;
  mapPayloadForApi?: (payload: PostExCreateOrderPayload) => PostExOrderPayload;
  now?: () => string;
};

export type PostExBookOrderHttpResult = { status: number; body: Record<string, unknown> };

/** Only local preflight failures prove that no create request reached PostEx. */
export function shouldReleasePostExBookingClaim(result: PostExCreateOrderResult): boolean {
  return !result.ok && result.failureKind === "definitive";
}

const UNKNOWN_BOOKING_ERROR =
  "PostEx booking could not be confirmed. The order remains locked for manual reconciliation.";

export async function runPostExBookOrder(
  orderId: string,
  deps: PostExBookOrderDeps,
): Promise<PostExBookOrderHttpResult> {
  const id = orderId?.trim();
  if (!id) return { status: 400, body: { error: "Missing orderId parameter" } };

  const order = await deps.getOrder(id);
  if (!order) return { status: 404, body: { error: "Order not found" } };
  if (order.postexTrackingNumber?.trim()) {
    return { status: 409, body: { error: POSTEX_BOOKING_CONFLICT_MESSAGE } };
  }

  const built = await deps.buildPostExPayload(order);
  if (!built.ok) return { status: built.status, body: { error: built.error } };

  const attemptId = await deps.claimOrder(id, deps.now?.() ?? new Date().toISOString());
  if (!attemptId) return { status: 409, body: { error: POSTEX_BOOKING_CONFLICT_MESSAGE } };

  const apiPayload = deps.mapPayloadForApi
    ? deps.mapPayloadForApi(built.payload)
    : toPostExOrderPayloadForApi(built.payload);
  let result: PostExCreateOrderResult;
  try {
    result = await deps.createPostExOrder(apiPayload);
  } catch {
    await deps.markUnknown(id, attemptId);
    return { status: 503, body: { error: UNKNOWN_BOOKING_ERROR } };
  }

  if (!result.ok) {
    if (shouldReleasePostExBookingClaim(result)) {
      const released = await deps.releaseClaim(id, attemptId);
      if (released) return { status: 400, body: { error: result.error } };
    }
    await deps.markUnknown(id, attemptId);
    return { status: 503, body: { error: UNKNOWN_BOOKING_ERROR } };
  }

  const persisted = await deps.completeBooking(
    id, result.trackingNumber, attemptId, deps.now?.() ?? new Date().toISOString(),
  );
  if (!persisted.ok) {
    await deps.markUnknown(id, attemptId);
    return {
      status: 503,
      body: { error: "PostEx may have created a shipment but tracking could not be saved. The order remains locked for manual reconciliation." },
    };
  }
  return {
    status: 200,
    body: {
      success: true,
      trackingNumber: result.trackingNumber,
      message: `Shipment booked successfully with PostEx (Tracking #: ${result.trackingNumber})`,
    },
  };
}
