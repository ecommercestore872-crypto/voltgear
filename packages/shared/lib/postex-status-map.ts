import type { OrderStatus } from "@/lib/types";

export type PostExStatusPreviewAction = "no_change" | "would_update" | "manual_review";

export type PostExToBuyNTryMapResult =
  | { kind: "mapped"; buyNTryStatus: OrderStatus }
  | { kind: "manual_review"; reason: string };

const AUTO_MAP: Record<string, OrderStatus> = {
  unbooked: "processing",
  booked: "processing",
  "picked by postex": "shipped",
  "postex warehouse": "shipped",
  "en-route to postex warehouse": "shipped",
  "out for delivery": "shipped",
  delivered: "delivered",
};

const MANUAL_REVIEW_STATUSES = new Set([
  "returned",
  "out for return",
  "attempted",
  "delivery under review",
  "expired",
  "un-assigned by me",
]);

/** Normalize PostEx transactionStatus for stable comparisons. */
export function normalizePostExTransactionStatus(
  transactionStatus: string | null | undefined,
): string {
  if (transactionStatus == null) return "";
  return transactionStatus.trim().replace(/\s+/g, " ").toLowerCase();
}

export function mapPostExTransactionStatusToBuyNTry(
  transactionStatus: string | null | undefined,
): PostExToBuyNTryMapResult {
  const normalized = normalizePostExTransactionStatus(transactionStatus);
  if (!normalized) {
    return { kind: "manual_review", reason: "PostEx transactionStatus is missing." };
  }

  if (MANUAL_REVIEW_STATUSES.has(normalized)) {
    return {
      kind: "manual_review",
      reason: `PostEx status "${transactionStatus?.trim() ?? ""}" requires manual review.`,
    };
  }

  const buyNTryStatus = AUTO_MAP[normalized];
  if (buyNTryStatus) {
    return { kind: "mapped", buyNTryStatus };
  }

  return {
    kind: "manual_review",
    reason: `Unsupported PostEx status "${transactionStatus?.trim() ?? ""}".`,
  };
}

const STATUS_PIPELINE: OrderStatus[] = ["new", "processing", "shipped", "delivered"];

/** Automatic PostEx sync may only advance along new → processing → shipped → delivered. */
export function isForwardPostExStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return false;
  if (from === "cancelled" || to === "cancelled") return false;
  const fromIdx = STATUS_PIPELINE.indexOf(from);
  const toIdx = STATUS_PIPELINE.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx > fromIdx;
}

export function derivePostExStatusPreviewAction(
  currentBuyNTryStatus: OrderStatus | undefined,
  mapResult: PostExToBuyNTryMapResult,
): {
  action: PostExStatusPreviewAction;
  proposedBuyNTryStatus: OrderStatus | null;
} {
  if (mapResult.kind === "manual_review") {
    return { action: "manual_review", proposedBuyNTryStatus: null };
  }

  const current = currentBuyNTryStatus ?? "new";
  const proposed = mapResult.buyNTryStatus;
  if (current === proposed) {
    return { action: "no_change", proposedBuyNTryStatus: proposed };
  }

  if (!isForwardPostExStatusTransition(current, proposed)) {
    return { action: "no_change", proposedBuyNTryStatus: current };
  }

  return { action: "would_update", proposedBuyNTryStatus: proposed };
}

export function formatPostExStatusSyncHistoryNote(
  postexStatus: string | null | undefined,
): string {
  const label = postexStatus?.trim() || "unknown";
  return `PostEx status sync: ${label}`;
}
