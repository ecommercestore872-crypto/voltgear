const FIRST_ORDER_NUMBER = 1001;

/** Store + running number. Example: BNT-1042 */
export function formatOrderId(n: number): string {
  return `BNT-${n}`;
}

export function parseSequentialOrderNumber(id: string): number | null {
  const match = /^BNT-(\d+)$/.exec(id.trim());
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export function nextSequentialNumber(existingIds: string[]): number {
  let max = FIRST_ORDER_NUMBER - 1;
  for (const id of existingIds) {
    const n = parseSequentialOrderNumber(id);
    if (n != null && n > max) max = n;
  }
  return max + 1;
}
