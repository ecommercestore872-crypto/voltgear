import {
  derivePostExStatusPreviewAction,
  mapPostExTransactionStatusToBuyNTry,
} from "@/lib/postex-status-map";

import {
  fetchPostExTrackOrderFromApi,
  mapPostExTrackBodyToSafeResponse,
  type PostExTrackOrderHttpResult,
} from "@/lib/postex-track-order";

import type { Order, OrderStatus } from "@/lib/types";

export type PostExStatusPreviewDeps = {
  getOrder: (orderId: string) => Promise<Order | null>;
  fetchTrack?: typeof fetchPostExTrackOrderFromApi;
};

export async function runPostExStatusPreviewForOrderId(
  orderId: string,
  deps: PostExStatusPreviewDeps,
): Promise<PostExTrackOrderHttpResult> {
  const trimmedId = orderId?.trim();
  if (!trimmedId) {
    return { status: 400, body: { success: false, error: "Missing orderId." } };
  }

  const order = await deps.getOrder(trimmedId);
  if (!order) {
    return { status: 404, body: { success: false, error: "Order not found." } };
  }

  const trackingNumber = order.postexTrackingNumber?.trim() ?? "";
  if (!trackingNumber) {
    return {
      status: 400,
      body: {
        success: false,
        error: "This order has no PostEx tracking number yet.",
      },
    };
  }

  const fetchTrack = deps.fetchTrack ?? fetchPostExTrackOrderFromApi;
  const tracked = await fetchTrack(trackingNumber);
  if (!tracked.ok) {
    return {
      status: tracked.httpStatus,
      body: {
        success: false,
        error: tracked.error,
        ...(tracked.httpStatus >= 400 ? { upstreamHttpStatus: tracked.httpStatus } : {}),
      },
    };
  }

  const trackSafe = mapPostExTrackBodyToSafeResponse(
    trimmedId,
    trackingNumber,
    tracked.data,
  );
  if ("ok" in trackSafe) {
    return { status: 502, body: { success: false, error: trackSafe.error } };
  }

  const postexStatus = trackSafe.transactionStatus;
  const mapResult = mapPostExTransactionStatusToBuyNTry(postexStatus);
  const currentBuyNTryStatus = (order.status ?? "new") as OrderStatus;
  const { action, proposedBuyNTryStatus } = derivePostExStatusPreviewAction(
    currentBuyNTryStatus,
    mapResult,
  );

  return {
    status: 200,
    body: {
      success: true,
      orderId: trimmedId,
      currentBuyNTryStatus,
      postexStatus,
      proposedBuyNTryStatus,
      action,
    },
  };
}
