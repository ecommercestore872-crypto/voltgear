import { TARGET_PROFIT_BUFFER } from "./analytics-coach-rules";
import { liveOrders, type AnalyticsItem, type AnalyticsOrder } from "./analytics-rules";

export const DEAL_BALANCE_RATIO = 0.4;
export const DEAL_MIN_PERCENT = 1;
export const DEAL_MAX_PERCENT = 40;

export type DealRecord = {
  id: string;
  title: string;
  slugA: string;
  slugB: string;
  percentOff: number;
  active: boolean;
};

export type DealCatalogProduct = {
  slug: string;
  name: string;
  price: number;
  costPrice: number | null;
  imageUrl?: string | null;
};

export type DealCartLine = {
  slug: string;
  quantity: number;
  price: number;
};

export type AppliedDeal = {
  id: string;
  title: string;
  applications: number;
  discount: number;
};

export type DealFloorInput = {
  priceA: number;
  priceB: number;
  costA: number | null;
  costB: number | null;
  shippingFee: number;
  packingFee: number;
  codFee: number;
  deliveryRate: number | null;
  rtoRate: number;
};

function money(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

export function normalizeDealSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

export function pairKey(slugA: string, slugB: string): string {
  const a = normalizeDealSlug(slugA);
  const b = normalizeDealSlug(slugB);
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

export function pairBalanceOk(priceA: number, priceB: number, ratio = DEAL_BALANCE_RATIO): boolean {
  const hi = Math.max(money(priceA), money(priceB));
  const lo = Math.min(money(priceA), money(priceB));
  if (!(hi > 0) || !(lo > 0)) return false;
  return lo / hi + 1e-12 >= ratio;
}

export function cheaperUnitPrice(priceA: number, priceB: number): number {
  return Math.min(money(priceA), money(priceB));
}

export function comboNeededPaid(input: DealFloorInput): number | null {
  if (input.costA == null || input.costB == null) return null;
  if (!Number.isFinite(input.costA) || !Number.isFinite(input.costB) || input.costA < 0 || input.costB < 0) {
    return null;
  }
  const variable = Math.max(0, money(input.shippingFee)) + Math.max(0, money(input.packingFee)) + Math.max(0, money(input.codFee));
  const delivery = input.deliveryRate != null && input.deliveryRate > 0 ? input.deliveryRate : 1;
  const leak = variable * (1 + Math.max(0, money(input.rtoRate)) / delivery);
  return Math.ceil((input.costA + input.costB + leak) / (1 - TARGET_PROFIT_BUFFER) - 1e-9);
}

export function comboPaidAfterDeal(priceA: number, priceB: number, percentOff: number): number {
  const off = (Math.max(0, money(percentOff)) / 100) * cheaperUnitPrice(priceA, priceB);
  return Math.round((money(priceA) + money(priceB) - off) * 100) / 100;
}

export function maxSafePercentOff(input: DealFloorInput): number | null {
  const needed = comboNeededPaid(input);
  if (needed == null) return null;
  const cheaper = cheaperUnitPrice(input.priceA, input.priceB);
  if (!(cheaper > 0)) return 0;
  const room = money(input.priceA) + money(input.priceB) - needed;
  if (room <= 0) return 0;
  return Math.max(0, Math.min(DEAL_MAX_PERCENT, Math.floor((100 * room) / cheaper)));
}

export function dealClearsFloor(input: DealFloorInput, percentOff: number): boolean {
  const needed = comboNeededPaid(input);
  if (needed == null) return false;
  return comboPaidAfterDeal(input.priceA, input.priceB, percentOff) + 0.5 >= needed;
}

export function validateDealAdminInput(
  raw: unknown,
  catalog: DealCatalogProduct[],
  existing: DealRecord[],
  floorExtras: Omit<DealFloorInput, "priceA" | "priceB" | "costA" | "costB">,
  editingId?: string
):
  | { ok: true; data: { title: string; slugA: string; slugB: string; percentOff: number; active: boolean } }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Send the two products and the percent off." };
  }
  const rec = raw as Record<string, unknown>;
  const slugA = normalizeDealSlug(rec.slugA);
  const slugB = normalizeDealSlug(rec.slugB);
  if (!slugA || !slugB) return { ok: false, error: "Pick two products." };
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const a = bySlug.get(slugA);
  const b = bySlug.get(slugB);
  if (!a || !b) return { ok: false, error: "One of those products is not in the catalog." };
  const percentOff = typeof rec.percentOff === "number" ? rec.percentOff : Number(rec.percentOff);
  if (!Number.isFinite(percentOff) || percentOff < DEAL_MIN_PERCENT || percentOff > DEAL_MAX_PERCENT) {
    return { ok: false, error: `Percent off the cheaper item must be ${DEAL_MIN_PERCENT}–${DEAL_MAX_PERCENT}.` };
  }
  if (!pairBalanceOk(a.price, b.price)) {
    return {
      ok: false,
      error: `This pair is too unbalanced (${formatRs(a.price)} + ${formatRs(b.price)}). The cheaper item must be at least ${Math.round(DEAL_BALANCE_RATIO * 100)}% of the dearer one.`,
    };
  }
  if (a.costPrice == null || b.costPrice == null) {
    return { ok: false, error: "Fill cost on both products in Coach before this deal can go live." };
  }
  const floorInput: DealFloorInput = {
    priceA: a.price,
    priceB: b.price,
    costA: a.costPrice,
    costB: b.costPrice,
    ...floorExtras,
  };
  if (!dealClearsFloor(floorInput, percentOff)) {
    const max = maxSafePercentOff(floorInput) ?? 0;
    return {
      ok: false,
      error:
        max <= 0
          ? "Even with 0% off this pair sits below the safe floor. Raise prices or lower cost first."
          : `That percent would sell below the safe floor. ${max}% off the cheaper item is the most this pair can take.`,
    };
  }
  const key = pairKey(slugA, slugB);
  const duplicate = existing.some((d) => d.id !== editingId && pairKey(d.slugA, d.slugB) === key);
  if (duplicate) return { ok: false, error: "That pair already has a deal." };
  const titleRaw = String(rec.title ?? "").trim();
  const title = titleRaw || `${a.name} + ${b.name}`;
  const active = rec.active === undefined ? true : Boolean(rec.active);
  return {
    ok: true,
    data: { title: title.slice(0, 80), slugA, slugB, percentOff, active },
  };
}

function formatRs(n: number): string {
  return `Rs ${Math.round(n).toLocaleString("en-PK")}`;
}

function expandUnits(lines: DealCartLine[]): { slug: string; price: number; used: boolean }[] {
  const units: { slug: string; price: number; used: boolean }[] = [];
  for (const line of lines) {
    const slug = normalizeDealSlug(line.slug);
    if (!slug) continue;
    const qty = Number.isInteger(line.quantity) ? line.quantity : Math.floor(Number(line.quantity) || 0);
    const price = money(line.price);
    if (qty < 1 || !(price > 0)) continue;
    for (let i = 0; i < Math.min(qty, 99); i++) units.push({ slug, price, used: false });
  }
  return units;
}

export function applyDealsToCart(lines: DealCartLine[], deals: DealRecord[]): {
  discount: number;
  applied: AppliedDeal[];
} {
  const units = expandUnits(lines);
  const active = deals
    .filter((d) => d.active && d.percentOff >= DEAL_MIN_PERCENT)
    .slice()
    .sort((a, b) => b.percentOff - a.percentOff || a.id.localeCompare(b.id));
  const applied: AppliedDeal[] = [];

  for (const deal of active) {
    const slugA = normalizeDealSlug(deal.slugA);
    const slugB = normalizeDealSlug(deal.slugB);
    const same = slugA === slugB;
    let applications = 0;
    let discount = 0;
    while (true) {
      if (same) {
        const first = units.findIndex((u) => !u.used && u.slug === slugA);
        const second = units.findIndex((u, i) => !u.used && u.slug === slugA && i !== first);
        if (first < 0 || second < 0) break;
        const pa = units[first].price;
        const pb = units[second].price;
        if (!pairBalanceOk(pa, pb)) break;
        units[first].used = true;
        units[second].used = true;
        discount += (deal.percentOff / 100) * Math.min(pa, pb);
        applications += 1;
        continue;
      }
      const ia = units.findIndex((u) => !u.used && u.slug === slugA);
      const ib = units.findIndex((u) => !u.used && u.slug === slugB);
      if (ia < 0 || ib < 0) break;
      const pa = units[ia].price;
      const pb = units[ib].price;
      if (!pairBalanceOk(pa, pb)) break;
      units[ia].used = true;
      units[ib].used = true;
      discount += (deal.percentOff / 100) * Math.min(pa, pb);
      applications += 1;
    }
    if (applications > 0) {
      applied.push({
        id: deal.id,
        title: deal.title,
        applications,
        discount: Math.round(discount * 100) / 100,
      });
    }
  }

  const total = Math.round(applied.reduce((s, row) => s + row.discount, 0) * 100) / 100;
  return { discount: total, applied };
}

export function promoBlockedByDeal(
  dealDiscount: number,
  promoType: string | null | undefined
): boolean {
  if (!(dealDiscount > 0)) return false;
  const type = (promoType ?? "").trim();
  return type === "percent" || type === "fixed";
}

export type DealSuggestion = {
  slugA: string;
  slugB: string;
  nameA: string;
  nameB: string;
  priceA: number;
  priceB: number;
  deliveredTogether: number;
  balanceOk: boolean;
  maxSafePercent: number | null;
  reason: string;
  canCreate: boolean;
};

function itemQty(item: AnalyticsItem): number {
  return Number(item.quantity ?? 1) || 1;
}

function uniqueSlugs(items: AnalyticsItem[] | null | undefined): string[] {
  const set = new Set<string>();
  for (const item of items ?? []) {
    const slug = normalizeDealSlug(item.slug);
    if (slug) set.add(slug);
  }
  return Array.from(set);
}

export function suggestDealPairs(
  orders: AnalyticsOrder[],
  catalog: DealCatalogProduct[],
  floorExtras: Omit<DealFloorInput, "priceA" | "priceB" | "costA" | "costB">,
  existing: DealRecord[] = []
): DealSuggestion[] {
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const taken = new Set(existing.map((d) => pairKey(d.slugA, d.slugB)));
  const counts = new Map<string, number>();

  for (const order of liveOrders(orders)) {
    if ((order.status ?? "") !== "delivered") continue;
    const slugs = uniqueSlugs(order.items).filter((slug) => bySlug.has(slug));
    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        const key = pairKey(slugs[i], slugs[j]);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  const out: DealSuggestion[] = [];
  Array.from(counts.entries()).forEach(([key, deliveredTogether]) => {
    if (taken.has(key)) return;
    const [slugA, slugB] = key.split("|");
    const a = bySlug.get(slugA);
    const b = bySlug.get(slugB);
    if (!a || !b) return;
    const balanceOk = pairBalanceOk(a.price, b.price);
    const maxSafePercent =
      a.costPrice == null || b.costPrice == null
        ? null
        : maxSafePercentOff({
            priceA: a.price,
            priceB: b.price,
            costA: a.costPrice,
            costB: b.costPrice,
            ...floorExtras,
          });
    let reason = "Ready to create.";
    let canCreate = true;
    if (!balanceOk) {
      reason = `Too unbalanced (${formatRs(a.price)} + ${formatRs(b.price)}). Cheaper item is under ${Math.round(DEAL_BALANCE_RATIO * 100)}% of the dearer one.`;
      canCreate = false;
    } else if (maxSafePercent == null) {
      reason = "Fill cost on both products first.";
      canCreate = false;
    } else if (maxSafePercent < DEAL_MIN_PERCENT) {
      reason = "Pair is below the safe floor even at 0% off.";
      canCreate = false;
    } else {
      reason = `Can take up to ${maxSafePercent}% off the cheaper item.`;
    }
    out.push({
      slugA,
      slugB,
      nameA: a.name,
      nameB: b.name,
      priceA: a.price,
      priceB: b.price,
      deliveredTogether,
      balanceOk,
      maxSafePercent,
      reason,
      canCreate,
    });
  });

  return out
    .sort((a, b) => {
      if (a.canCreate !== b.canCreate) return a.canCreate ? -1 : 1;
      return b.deliveredTogether - a.deliveredTogether;
    })
    .slice(0, 12);
}

export function publicDealsForSlug(slug: string, deals: DealRecord[], catalog: DealCatalogProduct[]) {
  const key = normalizeDealSlug(slug);
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const current = bySlug.get(key);
  if (!current) return [];
  const out: {
    dealId: string;
    title: string;
    percentOff: number;
    otherSlug: string;
    otherName: string;
    otherPrice: number;
    otherImage: string | null;
  }[] = [];
  for (const deal of deals) {
    if (!deal.active) continue;
    const a = normalizeDealSlug(deal.slugA);
    const b = normalizeDealSlug(deal.slugB);
    if (a !== key && b !== key) continue;
    const otherSlug = a === key ? b : a;
    const other = bySlug.get(otherSlug);
    if (!other) continue;
    if (!pairBalanceOk(current.price, other.price)) continue;
    out.push({
      dealId: deal.id,
      title: deal.title,
      percentOff: deal.percentOff,
      otherSlug: other.slug,
      otherName: other.name,
      otherPrice: other.price,
      otherImage: other.imageUrl ?? null,
    });
  }
  return out;
}

export function parseDealList(raw: unknown): DealRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: DealRecord[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const id = String(rec.id ?? "").trim();
    const slugA = normalizeDealSlug(rec.slugA);
    const slugB = normalizeDealSlug(rec.slugB);
    const percentOff = Number(rec.percentOff);
    if (!id || !slugA || !slugB || !Number.isFinite(percentOff)) continue;
    const key = pairKey(slugA, slugB);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id,
      title: String(rec.title ?? "").trim().slice(0, 80) || `${slugA} + ${slugB}`,
      slugA,
      slugB,
      percentOff,
      active: rec.active !== false,
    });
  }
  return out;
}
