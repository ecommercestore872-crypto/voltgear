import {
  derivePostExStatusPreviewAction,
  formatPostExStatusSyncHistoryNote,
  mapPostExTransactionStatusToBuyNTry,
} from "@/lib/postex-status-map";

import {
  fetchPostExTrackOrderFromApi,
  mapPostExTrackBodyToSafeResponse,
} from "@/lib/postex-track-order";

import type { Order, OrderStatus } from "@/lib/types";

export type PostExStatusSyncHttpResult = {
  status: number;
  body: Record<string, unknown>;
};

export type PostExStatusSyncDeps = {
  getOrder: (orderId: string) => Promise<Order | null>;
  fetchTrack?: typeof fetchPostExTrackOrderFromApi;
  applyStatusUpdate: (
    orderId: string,
    newStatus: OrderStatus,
    note: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  now?: () => string;
};

export async function runPostExStatusSyncForOrderId(
  orderId: string,
  deps: PostExStatusSyncDeps,
): Promise<PostExStatusSyncHttpResult> {
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
  const previousStatus = (order.status ?? "new") as OrderStatus;
  const mapResult = mapPostExTransactionStatusToBuyNTry(postexStatus);
  const preview = derivePostExStatusPreviewAction(previousStatus, mapResult);

  if (preview.action === "manual_review") {
    return {
      status: 409,
      body: {
        success: false,
        orderId: trimmedId,
        postexStatus,
        currentStatus: previousStatus,
        action: "manual_review",
      },
    };
  }

  const trackingMeta = {
    orderPickupDate: trackSafe.orderPickupDate,
    orderDeliveryDate: trackSafe.orderDeliveryDate,
    transactionDate: trackSafe.transactionDate,
    transactionStatusHistory: trackSafe.transactionStatusHistory,
  };

  if (preview.action === "no_change" || !preview.proposedBuyNTryStatus) {
    return {
      status: 200,
      body: {
        success: true,
        orderId: trimmedId,
        postexStatus,
        previousStatus,
        newStatus: previousStatus,
        action: "no_change",
        ...trackingMeta,
      },
    };
  }

  const newStatus = preview.proposedBuyNTryStatus;
  const note = formatPostExStatusSyncHistoryNote(postexStatus);
  const applied = await deps.applyStatusUpdate(trimmedId, newStatus, note);
  if (!applied.ok) {
    return {
      status: 503,
      body: { success: false, error: applied.error },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      orderId: trimmedId,
      postexStatus,
      previousStatus,
      newStatus,
      action: "updated",
      ...trackingMeta,
    },
  };
}
