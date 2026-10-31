import {
  normalizeCheckoutCustomer,
  normalizePhoneForCheckout,
  type CheckoutCustomerInput,
} from "@/lib/checkout-customer-rules";
import {
  isPakistanRegionCode,
  resolveCheckoutLocation,
} from "@/lib/pakistan-locations";

export type CheckoutFormField =
  | "name"
  | "phone"
  | "address"
  | "email"
  | "province"
  | "city";

export function validateCheckoutFormField(
  field: CheckoutFormField,
  value: string,
  ctx?: { province?: string; cityId?: string },
): string | null {
  const v = value.trim();
  switch (field) {
    case "name":
      if (v.length < 2) {
        return "Enter your full name (at least 2 characters).";
      }
      return null;
    case "phone":
      if (!v) return "Enter your mobile number for delivery.";
      if (!normalizePhoneForCheckout(v)) {
        return "Use a Pakistani mobile (e.g. 03XX XXXXXXX).";
      }
      return null;
    case "address":
      if (v.length < 5) {
        return "Add house, street, and area (at least 5 characters).";
      }
      return null;
    case "email":
      if (!v) return null;
      if (v.includes("@") && v.length >= 5) return null;
      return "Enter a valid email or leave blank.";
    case "province":
      if (!v || !isPakistanRegionCode(v.toUpperCase())) {
        return "Select your province / region.";
      }
      return null;
    case "city": {
      const location = resolveCheckoutLocation({
        province: ctx?.province || undefined,
        city: v,
        cityId: ctx?.cityId || v,
      });
      if (!location.ok) return location.error;
      return null;
    }
    default:
      return null;
  }
}

/** Inline errors keyed by field name; empty when valid. */
export function validateCheckoutFormFields(
  raw: CheckoutCustomerInput,
): Partial<Record<CheckoutFormField, string>> {
  const errors: Partial<Record<CheckoutFormField, string>> = {};
  for (const field of [
    "name",
    "phone",
    "address",
    "email",
    "province",
  ] as const) {
    const msg = validateCheckoutFormField(field, String(raw[field] ?? ""));
    if (msg) errors[field] = msg;
  }
  const cityMsg = validateCheckoutFormField("city", String(raw.city ?? ""), {
    province: raw.province,
    cityId: raw.cityId,
  });
  if (cityMsg) errors.city = cityMsg;

  if (Object.keys(errors).length === 0) {
    const full = normalizeCheckoutCustomer(raw);
    if (!full.ok) {
      errors.phone = full.error;
    }
  }
  return errors;
}
