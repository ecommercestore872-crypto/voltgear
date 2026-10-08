const CHECKOUT_BUSINESS_MESSAGES = [
  {
    prefix: "IDEMPOTENCY_CONFLICT",
    message:
      "This checkout request was already used for a different cart. Please refresh and try again.",
  },
  {
    prefix: "Insufficient stock",
    message: "One or more items no longer have enough stock.",
  },
  {
    prefix: "Product not found",
    message: "One or more items are no longer available.",
  },
  {
    prefix: "Variant not found",
    message: "One or more selected options are no longer available.",
  },
  {
    prefix: "Invalid quantity",
    message: "One or more item quantities are invalid.",
  },
] as const;

export function safeCheckoutBusinessError(databaseMessage: string): string {
  const normalized = databaseMessage.trim().split("\n", 1)[0] ?? "";
  return (
    CHECKOUT_BUSINESS_MESSAGES.find(({ prefix }) =>
      normalized.startsWith(prefix),
    )?.message ?? "We could not place this order with the selected items."
  );
}
