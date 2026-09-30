import type { PostExOrderPayload } from "@/lib/postex";

import {
  toPostExOrderPayloadForApi,
  type PostExCreateOrderPayload,
} from "@/lib/postex-order-payload";

import type { Order } from "@/lib/types";



export const POSTEX_BOOKING_CONFLICT_MESSAGE =

  "PostEx booking is already in progress or this order has already been booked.";



export type PostExCreateOrderResult =

  | { ok: true; trackingNumber: string }

  | { ok: false; error: string };



export type PostExBookPayloadResult =

  | { ok: true; payload: PostExCreateOrderPayload }

  | { ok: false; status: number; error: string };



export type PostExBookOrderDeps = {

  getOrder: (orderId: string) => Promise<Order | null>;

  buildPostExPayload: (order: Order) => Promise<PostExBookPayloadResult>;

  claimOrder: (orderId: string, claimedAt: string) => Promise<boolean>;

  releaseClaim: (orderId: string) => Promise<void>;

  completeBooking: (

    orderId: string,

    trackingNumber: string,

    shippedAt: string,

  ) => Promise<{ ok: true } | { ok: false; error: string }>;

  createPostExOrder: (payload: PostExOrderPayload) => Promise<PostExCreateOrderResult>;

  mapPayloadForApi?: (payload: PostExCreateOrderPayload) => PostExOrderPayload;

  now?: () => string;

};



export type PostExBookOrderHttpResult = {

  status: number;

  body: Record<string, unknown>;

};



/**

 * Definite upstream rejection (no tracking returned) — safe to release the DB claim.

 * Ambiguous failures keep the claim to block duplicate create-order.

 */

export function shouldReleasePostExBookingClaim(

  postExResult: PostExCreateOrderResult,

): boolean {

  if (postExResult.ok) return false;

  const error = postExResult.error;

  if (/PostEx API Token is missing/i.test(error)) return true;

  if (/PostEx error/i.test(error)) return true;

  if (/tracking number was missing/i.test(error)) return false;

  if (/Failed to communicate with PostEx/i.test(error)) return false;

  return false;

}



export async function runPostExBookOrder(

  orderId: string,

  deps: PostExBookOrderDeps,

): Promise<PostExBookOrderHttpResult> {

  const trimmedId = orderId?.trim();

  if (!trimmedId) {

    return { status: 400, body: { error: "Missing orderId parameter" } };

  }



  const order = await deps.getOrder(trimmedId);

  if (!order) {

    return { status: 404, body: { error: "Order not found" } };

  }



  if (order.postexTrackingNumber?.trim()) {

    return { status: 409, body: { error: POSTEX_BOOKING_CONFLICT_MESSAGE } };

  }



  const built = await deps.buildPostExPayload(order);

  if (!built.ok) {

    return { status: built.status, body: { error: built.error } };

  }



  const nowIso = deps.now?.() ?? new Date().toISOString();

  const claimed = await deps.claimOrder(trimmedId, nowIso);

  if (!claimed) {

    return { status: 409, body: { error: POSTEX_BOOKING_CONFLICT_MESSAGE } };

  }



  const apiPayload = deps.mapPayloadForApi
    ? deps.mapPayloadForApi(built.payload)
    : toPostExOrderPayloadForApi(built.payload);

  let postExResult: PostExCreateOrderResult;
  try {
    postExResult = await deps.createPostExOrder(apiPayload);

  } catch {

    return {

      status: 503,

      body: {

        error:

          "PostEx booking could not be confirmed. The order remains locked for manual reconciliation.",

      },

    };

  }



  if (!postExResult.ok) {

    if (shouldReleasePostExBookingClaim(postExResult)) {

      await deps.releaseClaim(trimmedId);

      return { status: 400, body: { error: postExResult.error } };

    }

    return {

      status: 503,

      body: {

        error:

          "PostEx booking could not be confirmed. The order remains locked for manual reconciliation.",

      },

    };

  }



  const persisted = await deps.completeBooking(

    trimmedId,

    postExResult.trackingNumber,

    nowIso,

  );



  if (!persisted.ok) {

    return {

      status: 503,

      body: {

        error:

          "PostEx may have created a shipment but tracking could not be saved. The order remains locked for manual reconciliation.",

      },

    };

  }



  return {

    status: 200,

    body: {

      success: true,

      trackingNumber: postExResult.trackingNumber,

      message: `Shipment booked successfully with PostEx (Tracking #: ${postExResult.trackingNumber})`,

    },

  };

}


