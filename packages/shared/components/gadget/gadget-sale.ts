export function salePercent(price: number, compareAt?: number): number | null {
  if (!compareAt || compareAt <= price) return null;
  const n = Math.round(((compareAt - price) / compareAt) * 100);
  return n > 0 ? n : null;
}
