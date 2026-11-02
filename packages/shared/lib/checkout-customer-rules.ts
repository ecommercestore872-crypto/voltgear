import { normalizePhone } from "@/lib/messaging";
import { resolveCheckoutLocation } from "@/lib/pakistan-locations";

export type CheckoutCustomerInput = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  province?: string;
  city?: string;
  cityId?: string;
  postal?: string;
  note?: string;
};

export type NormalizedCheckoutCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  province: string;
  city: string;
  cityId: string;
  postal?: string;
  note?: string;
};

/** COD-friendly: phone + address + delivery location required. */
export function normalizePhoneForCheckout(raw: string): string | null {
  const strict = normalizePhone(raw);
  if (strict) return strict;
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) {
    return `+92${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 14) {
    const last10 = digits.slice(-10);
    if (last10.startsWith("3")) return `+92${last10}`;
  }
  return null;
}

export function resolveCheckoutEmail(
  email: string | undefined,
  phoneE164: string,
): string {
  const trimmed = email?.trim().toLowerCase() ?? "";
  if (trimmed.includes("@") && trimmed.length >= 5) {
    return trimmed;
  }
  const digits = phoneE164.replace(/\D/g, "");
  return `cod.${digits || "unknown"}@orders.buyntryy.com`;
}

export function normalizeCheckoutCustomer(
  raw: CheckoutCustomerInput | undefined | null,
):
  | { ok: true; customer: NormalizedCheckoutCustomer }
  | { ok: false; error: string } {
  const name = raw?.name?.trim() ?? "";
  const address = raw?.address?.trim() ?? "";
  const phoneRaw = raw?.phone?.trim() ?? "";

  if (name.length < 2) {
    return { ok: false, error: "Please enter your name." };
  }
  if (address.length < 5) {
    return {
      ok: false,
      error: "Please enter your delivery address (area, street, house).",
    };
  }
  if (!phoneRaw) {
    return { ok: false, error: "Please enter a mobile number for delivery." };
  }

  const phone = normalizePhoneForCheckout(phoneRaw);
  if (!phone) {
    return {
      ok: false,
      error:
        "Please enter a mobile number we can reach you on (e.g. 03XX XXXXXXX).",
    };
  }

  const location = resolveCheckoutLocation({
    province: raw?.province,
    city: raw?.city,
    cityId: raw?.cityId,
  });
  if (!location.ok) {
    return { ok: false, error: location.error };
  }

  const email = resolveCheckoutEmail(raw?.email, phone);
  const postal = raw?.postal?.trim() || undefined;
  const note = raw?.note?.trim() || undefined;

  return {
    ok: true,
    customer: {
      name,
      email,
      phone,
      address,
      province: location.province,
      city: location.cityLabel,
      cityId: location.cityId,
      postal,
      note,
    },
  };
}
