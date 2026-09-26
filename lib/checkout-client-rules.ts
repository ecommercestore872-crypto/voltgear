const FIELD_VALIDATION_CATEGORIES = new Set([
  "name",
  "email",
  "phone",
  "address",
  "city",
]);

export function validationCategoryFromFieldName(name: string): string {
  if (FIELD_VALIDATION_CATEGORIES.has(name)) return name;
  return "other";
}

export function checkoutValidationCategoryFromHttp(
  status: number,
  error?: string,
): "price_changed" | "empty_cart" | "stock" | "other" | null {
  if (status === 409) return "price_changed";
  if (status !== 400) return null;
  const message = (error ?? "").toLowerCase();
  if (message.includes("empty")) return "empty_cart";
  if (
    message.includes("sold out") ||
    message.includes("no longer available") ||
    message.includes("stock")
  ) {
    return "stock";
  }
  return "other";
}
