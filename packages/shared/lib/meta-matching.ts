import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export type MetaCustomer = {
  email?: string;
  phone?: string;
  fullName?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  externalId?: string;
};

export function metaHash(value: string): string {
  return bytesToHex(sha256(utf8ToBytes(value)));
}

function isExistingDigest(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

/** Meta expects the country code and digits, without formatting punctuation. */
export function normalizeMetaPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^03\d{9}$/.test(digits)) digits = `92${digits.slice(1)}`;
  else if (/^3\d{9}$/.test(digits)) digits = `92${digits}`;
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return digits;
}

export function buildMetaHashedCustomer(input: MetaCustomer): Record<string, string> {
  const out: Record<string, string> = {};
  const email = input.email?.trim().toLowerCase();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.em = metaHash(email);
  const phone = input.phone ? normalizeMetaPhone(input.phone) : null;
  if (phone) out.ph = metaHash(phone);
  const names = input.fullName?.trim().toLowerCase().replace(/\s+/g, " ").split(" ") ?? [];
  if (names[0] && !isExistingDigest(names[0])) out.fn = metaHash(names[0]);
  if (names.length > 1 && !isExistingDigest(names.slice(1).join(" "))) out.ln = metaHash(names.slice(1).join(" "));
  const city = input.city?.trim().toLowerCase().replace(/[.\-_,]/g, "").replace(/\s+/g, " ");
  if (city && !isExistingDigest(city)) out.ct = metaHash(city);
  const postal = input.postalCode?.trim().toLowerCase().replace(/\s+/g, "");
  if (postal && !isExistingDigest(postal)) out.zp = metaHash(postal);
  const country = input.country?.trim().toLowerCase();
  if (country && !isExistingDigest(country)) out.country = metaHash(country === "pakistan" ? "pk" : country);
  const externalId = input.externalId?.trim();
  if (externalId && !isExistingDigest(externalId)) out.external_id = metaHash(externalId);
  return out;
}
