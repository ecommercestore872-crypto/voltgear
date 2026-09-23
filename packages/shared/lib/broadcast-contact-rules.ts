import { normalizePhone } from "./messaging";

export function idsMatchingNormalizedPhone(
  rows: { id: string; phone?: string | null }[],
  normalized: string
): string[] {
  return rows
    .filter((row) => normalizePhone(String(row.phone ?? "")) === normalized)
    .map((row) => row.id);
}

export function phonesMatchingNormalized(
  phones: string[],
  normalized: string
): string[] {
  return phones.filter((phone) => normalizePhone(phone) === normalized);
}

export function suppressedPhoneSet(raw: string[]): Set<string> {
  const set = new Set<string>();
  for (const value of raw) {
    const normalized = normalizePhone(value);
    if (normalized) set.add(normalized);
  }
  return set;
}

export type ManualAddPlan =
  | { action: "reject"; error: string }
  | { action: "insert" }
  | { action: "update"; ids: string[] };

export function planManualAdd(input: {
  phone: string | null;
  visibleContacts: { phone: string; source: "order" | "manual" }[];
  manualRows: { id: string; phone?: string | null }[];
}): ManualAddPlan {
  if (!input.phone) {
    return { action: "reject", error: "Enter a valid Pakistani mobile number." };
  }
  const matchingIds = idsMatchingNormalizedPhone(input.manualRows, input.phone);
  if (matchingIds.length) {
    return { action: "update", ids: matchingIds };
  }
  if (input.visibleContacts.some((c) => c.phone === input.phone && c.source === "order")) {
    return {
      action: "reject",
      error: "That number already exists (from an order or manual list).",
    };
  }
  return { action: "insert" };
}
