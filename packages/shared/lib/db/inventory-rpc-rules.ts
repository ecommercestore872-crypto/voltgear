export type CancelOrderRpcOutcome =
  | { ok: true }
  | { ok: false; error: string; infrastructure: boolean };

const CANCEL_BUSINESS_ERRORS = new Map<string, string>([
  ["Order not found", "Order not found"],
  ["Cannot cancel a delivered order", "Cannot cancel a delivered order"],
]);

export function interpretCancelOrderRpcResult(
  data: unknown,
  errorMessage?: string,
): CancelOrderRpcOutcome {
  if (
    data &&
    typeof data === "object" &&
    "ok" in data &&
    (data as { ok?: unknown }).ok === true
  ) {
    return { ok: true };
  }

  const marker = "BUSINESS_ERROR:";
  const markerIndex = errorMessage?.indexOf(marker) ?? -1;
  if (markerIndex >= 0) {
    const databaseMessage = errorMessage
      ?.slice(markerIndex + marker.length)
      .trim()
      .split("\n", 1)[0];
    const safeMessage = databaseMessage
      ? CANCEL_BUSINESS_ERRORS.get(databaseMessage)
      : undefined;
    return {
      ok: false,
      error: safeMessage ?? "This order cannot be cancelled.",
      infrastructure: false,
    };
  }

  return {
    ok: false,
    error: "Cancellation failed due to a system error.",
    infrastructure: true,
  };
}
