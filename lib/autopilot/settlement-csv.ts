import type { RawCourierPayoutRecord } from "./settlement-engine";

export function parseSettlementCsv(text: string): RawCourierPayoutRecord[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const trackIdx = header.findIndex((h) => h.includes("track"));
  const collectedIdx = header.findIndex((h) => h.includes("collect") || h === "cod");
  const feeIdx = header.findIndex((h) => h.includes("fee") || h.includes("shipping"));
  if (trackIdx < 0 || collectedIdx < 0) return [];
  const rows: RawCourierPayoutRecord[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((c) => c.trim());
    const trackingNumber = cols[trackIdx] ?? "";
    if (!trackingNumber) continue;
    rows.push({
      trackingNumber,
      collectedCod: Number(cols[collectedIdx] ?? 0) || 0,
      chargedShippingFee: feeIdx >= 0 ? Number(cols[feeIdx] ?? 0) || 0 : 0,
    });
  }
  return rows;
}
