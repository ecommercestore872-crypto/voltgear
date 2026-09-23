export const FULFILLMENT_MATURITY_HOURS = 24;

export type InsightCard = {
  id: string;
  title: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: string[];
  possibleCauses: string[];
  recommendedChecks: string[];
};

type RuleId =
  | "shop_drop_product_view"
  | "shop_drop_add_to_cart"
  | "shop_drop_checkout"
  | "shop_drop_convert"
  | "source_underperforms"
  | "landing_low_pdp"
  | "checkout_validation_hotspot"
  | "fulfillment_processing_gap"
  | "fulfillment_cancel_rate";

type ShopRates = {
  pvRate: number | null;
  atcRate: number | null;
  checkoutRate: number | null;
  convertRate: number | null;
};

type Candidate = {
  id: RuleId;
  confidence: "HIGH" | "MEDIUM";
  gap: number;
  title: string;
  evidence: string[];
  possibleCauses: string[];
  recommendedChecks: string[];
};

const SHOP_FLOORS = {
  shop_drop_product_view: 0.3,
  shop_drop_add_to_cart: 0.15,
  shop_drop_checkout: 0.3,
  shop_drop_convert: 0.4,
} as const;

const SHOP_RATE_KEYS: Record<
  keyof typeof SHOP_FLOORS,
  keyof ShopRates
> = {
  shop_drop_product_view: "pvRate",
  shop_drop_add_to_cart: "atcRate",
  shop_drop_checkout: "checkoutRate",
  shop_drop_convert: "convertRate",
};

const SHOP_TITLES: Record<keyof typeof SHOP_FLOORS, string> = {
  shop_drop_product_view: "Product view rate is low",
  shop_drop_add_to_cart: "Add-to-cart rate after product view is low",
  shop_drop_checkout: "Checkout rate after add-to-cart is low",
  shop_drop_convert: "Order conversion after checkout is low",
};

const SHOP_CAUSES: Record<keyof typeof SHOP_FLOORS, string[]> = {
  shop_drop_product_view: [
    "Landing pages may not expose products clearly",
    "Traffic may be low-intent or mismatched to catalog",
  ],
  shop_drop_add_to_cart: [
    "Product pages may lack compelling offers or trust signals",
    "Pricing or variant selection may be confusing",
  ],
  shop_drop_checkout: [
    "Cart friction or unexpected costs may block checkout",
    "Checkout entry may be hard to find from cart",
  ],
  shop_drop_convert: [
    "Checkout form or payment flow may be failing shoppers",
    "COD confirmation step may be losing buyers",
  ],
};

const SHOP_CHECKS: Record<keyof typeof SHOP_FLOORS, string[]> = {
  shop_drop_product_view: [
    "Review top landing pages and hero links to products",
    "Compare product-view reach by source in Traffic",
  ],
  shop_drop_add_to_cart: [
    "Inspect PDP layout, price display, and add-to-cart placement",
    "Check whether key variants are in stock",
  ],
  shop_drop_checkout: [
    "Walk cart-to-checkout on mobile and desktop",
    "Review cart abandonment timing in Funnel",
  ],
  shop_drop_convert: [
    "Test checkout validation errors and confirmation step",
    "Compare checkout-started vs linked orders in Funnel",
  ],
};

export function relativeDrop(prior: number, current: number): number | null {
  if (prior === 0) {
    return null;
  }
  return (prior - current) / prior;
}

export function relativeRise(prior: number, current: number): number | null {
  if (prior === 0) {
    return null;
  }
  return (current - prior) / prior;
}

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function shopConfidence(
  sessionCount: number,
  prior: BuildInsightsInput["prior"]
): "HIGH" | "MEDIUM" {
  if (sessionCount >= 100 && prior?.trafficAvailable) {
    return "HIGH";
  }
  return "MEDIUM";
}

function fulfillmentConfidence(
  maturePlaced: number,
  priorMature: BuildInsightsInput["priorMature"]
): "HIGH" | "MEDIUM" {
  if (maturePlaced >= 30 && priorMature) {
    return "HIGH";
  }
  return "MEDIUM";
}

function evaluateShopRule(
  ruleId: keyof typeof SHOP_FLOORS,
  currentRate: number | null,
  priorRate: number | null,
  sessionCount: number,
  prior: BuildInsightsInput["prior"]
): Candidate | null {
  if (currentRate === null) {
    return null;
  }

  const floor = SHOP_FLOORS[ruleId];
  let gap = 0;
  const evidence: string[] = [];
  let triggered = false;

  if (currentRate < floor) {
    const absoluteGap = floor - currentRate;
    gap = Math.max(gap, absoluteGap);
    evidence.push(
      `Current transition rate ${pct(currentRate)} is below the ${pct(floor)} floor`
    );
    triggered = true;
  }

  if (
    prior?.trafficAvailable &&
    priorRate !== null &&
    priorRate !== 0
  ) {
    const drop = relativeDrop(priorRate, currentRate);
    if (drop !== null && drop >= 0.25) {
      const relativeGap = drop;
      gap = Math.max(gap, relativeGap);
      evidence.push(
        `Prior transition rate ${pct(priorRate)} vs current ${pct(currentRate)} (${pct(drop)} relative drop)`
      );
      triggered = true;
    }
  }

  if (!triggered) {
    return null;
  }

  return {
    id: ruleId,
    confidence: shopConfidence(sessionCount, prior),
    gap,
    title: SHOP_TITLES[ruleId],
    evidence,
    possibleCauses: SHOP_CAUSES[ruleId],
    recommendedChecks: SHOP_CHECKS[ruleId],
  };
}

function evaluateShopRules(input: BuildInsightsInput): Candidate[] {
  const candidates: Candidate[] = [];
  for (const ruleId of Object.keys(SHOP_FLOORS) as Array<keyof typeof SHOP_FLOORS>) {
    const rateKey = SHOP_RATE_KEYS[ruleId];
    const card = evaluateShopRule(
      ruleId,
      input.shop[rateKey],
      input.prior?.shop[rateKey] ?? null,
      input.sessionCount,
      input.prior
    );
    if (card) {
      candidates.push(card);
    }
  }
  return candidates;
}

function evaluateSourceRule(input: BuildInsightsInput): Candidate | null {
  if (input.sessionCount <= 0) {
    return null;
  }
  const siteRate = input.convertedSessions / input.sessionCount;
  const threshold = siteRate / 2;

  let worst: Candidate | null = null;

  for (const row of input.sources) {
    if (row.sessions < 30 || row.convertedRate > threshold) {
      continue;
    }
    const gap = threshold - row.convertedRate;
    if (!worst || gap > worst.gap) {
      worst = {
        id: "source_underperforms",
        confidence: shopConfidence(input.sessionCount, input.prior),
        gap,
        title: "A traffic source converts far below site average",
        evidence: [
          `Source ${row.source}: ${pct(row.convertedRate)} converted-session rate across ${row.sessions} sessions`,
          `Site converted-session rate is ${pct(siteRate)}; underperform threshold is ${pct(threshold)}`,
        ],
        possibleCauses: [
          "Creative or audience mismatch for this source",
          "Landing experience may not match ad promise",
        ],
        recommendedChecks: [
          "Compare landing paths and funnel steps for this source",
          "Review campaign targeting and recent creative changes",
        ],
      };
    }
  }

  return worst;
}

function isCheckoutLandingPath(path: string): boolean {
  return path === "/checkout" || path.startsWith("/checkout/");
}

function evaluateLandingRule(input: BuildInsightsInput): Candidate | null {
  const floor = 0.2;
  let worst: Candidate | null = null;

  for (const row of input.landings) {
    if (row.sessions < 30 || isCheckoutLandingPath(row.path)) {
      continue;
    }
    if (row.pvReachRate >= floor) {
      continue;
    }
    const gap = floor - row.pvReachRate;
    if (!worst || gap > worst.gap) {
      worst = {
        id: "landing_low_pdp",
        confidence: shopConfidence(input.sessionCount, input.prior),
        gap,
        title: "A landing path rarely reaches product views",
        evidence: [
          `Landing ${row.path}: ${pct(row.pvReachRate)} product-view reach across ${row.sessions} sessions`,
          `Product-view reach is below the ${pct(floor)} floor`,
        ],
        possibleCauses: [
          "Visitors may bounce before seeing products",
          "Landing content may not route shoppers to PDPs",
        ],
        recommendedChecks: [
          "Open the landing path and trace first clicks to products",
          "Compare this path with higher-reach landings in Traffic",
        ],
      };
    }
  }

  return worst;
}

function evaluateValidationRule(input: BuildInsightsInput): Candidate | null {
  if (input.validationEvents.length < 20) {
    return null;
  }

  const counts = new Map<string, number>();
  for (const event of input.validationEvents) {
    counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
  }

  const total = input.validationEvents.length;
  let dominantCategory: string | null = null;
  let dominantCount = 0;

  for (const [category, count] of Array.from(counts)) {
    if (count > dominantCount) {
      dominantCategory = category;
      dominantCount = count;
    }
  }

  if (!dominantCategory) {
    return null;
  }

  const share = dominantCount / total;
  if (share < 0.4) {
    return null;
  }

  return {
    id: "checkout_validation_hotspot",
    confidence: "MEDIUM",
    gap: share - 0.4,
    title: "Checkout validation errors cluster on one field",
    evidence: [
      `${dominantCount} of ${total} validation events (${pct(share)}) are category ${dominantCategory}`,
      "One category accounts for at least 40% of checkout validation events",
    ],
    possibleCauses: [
      "Form labels or validation rules may confuse shoppers",
      "A required field may be missing clear guidance",
    ],
    recommendedChecks: [
      "Reproduce checkout with invalid values for the dominant category",
      "Review field labels, hints, and mobile keyboard types",
    ],
  };
}

function evaluateFulfillmentRules(input: BuildInsightsInput): Candidate[] {
  const candidates: Candidate[] = [];
  const { maturePlaced, matureProcessingReached, matureCancelled, priorMature } = input;

  if (maturePlaced < 10) {
    return candidates;
  }

  const processingRate = matureProcessingReached / maturePlaced;
  const cancelRate = matureCancelled / maturePlaced;
  const priorProcessingRate =
    priorMature && priorMature.placed > 0
      ? priorMature.processingReached / priorMature.placed
      : null;
  const priorCancelRate =
    priorMature && priorMature.placed > 0
      ? priorMature.cancelled / priorMature.placed
      : null;

  let processingGap = 0;
  const processingEvidence: string[] = [];
  let processingTriggered = false;

  if (processingRate < 0.5) {
    processingGap = Math.max(processingGap, 0.5 - processingRate);
    processingEvidence.push(
      `Mature placed-to-processing rate is ${pct(processingRate)} (below ${pct(0.5)} floor)`
    );
    processingTriggered = true;
  }

  if (priorProcessingRate !== null && priorProcessingRate !== 0) {
    const drop = relativeDrop(priorProcessingRate, processingRate);
    if (drop !== null && drop >= 0.25) {
      processingGap = Math.max(processingGap, drop);
      processingEvidence.push(
        `Prior mature processing rate ${pct(priorProcessingRate)} vs current ${pct(processingRate)} (${pct(drop)} relative drop)`
      );
      processingTriggered = true;
    }
  }

  if (processingTriggered) {
    candidates.push({
      id: "fulfillment_processing_gap",
      confidence: fulfillmentConfidence(maturePlaced, priorMature),
      gap: processingGap,
      title: "Mature orders are slow to reach processing",
      evidence: processingEvidence,
      possibleCauses: [
        "Ops backlog may delay moving orders into processing",
        "Payment or verification steps may stall order handling",
      ],
      recommendedChecks: [
        "Review mature orders stuck before processing in admin",
        "Check whether staffing or verification rules changed recently",
      ],
    });
  }

  let cancelGap = 0;
  const cancelEvidence: string[] = [];
  let cancelTriggered = false;

  if (cancelRate >= 0.25) {
    cancelGap = Math.max(cancelGap, cancelRate - 0.25);
    cancelEvidence.push(
      `Mature cancel rate is ${pct(cancelRate)} (at or above ${pct(0.25)} floor)`
    );
    cancelTriggered = true;
  }

  if (priorCancelRate !== null && priorCancelRate !== 0) {
    const rise = relativeRise(priorCancelRate, cancelRate);
    if (rise !== null && rise >= 0.25) {
      cancelGap = Math.max(cancelGap, rise);
      cancelEvidence.push(
        `Prior mature cancel rate ${pct(priorCancelRate)} vs current ${pct(cancelRate)} (${pct(rise)} relative rise)`
      );
      cancelTriggered = true;
    }
  }

  if (cancelTriggered) {
    candidates.push({
      id: "fulfillment_cancel_rate",
      confidence: fulfillmentConfidence(maturePlaced, priorMature),
      gap: cancelGap,
      title: "Mature order cancellation rate is elevated",
      evidence: cancelEvidence,
      possibleCauses: [
        "Stockouts or delivery constraints may drive cancellations",
        "Customer contact failures may increase COD cancels",
      ],
      recommendedChecks: [
        "Inspect cancellation reasons on mature orders",
        "Compare cancel timing with inventory or courier changes",
      ],
    });
  }

  return candidates;
}

export type BuildInsightsInput = {
  now: Date;
  trafficAvailable: boolean;
  sessionCount: number;
  convertedSessions: number;
  shop: ShopRates;
  prior: null | {
    trafficAvailable: boolean;
    sessionCount: number;
    shop: ShopRates;
  };
  sources: { source: string; sessions: number; convertedRate: number }[];
  landings: { path: string; sessions: number; pvReachRate: number }[];
  validationEvents: { category: string }[];
  maturePlaced: number;
  matureProcessingReached: number;
  matureCancelled: number;
  priorMature: null | {
    placed: number;
    processingReached: number;
    cancelled: number;
  };
};

export function buildInsights(input: BuildInsightsInput): InsightCard[] {
  const candidates: Candidate[] = [];

  if (input.trafficAvailable && input.sessionCount >= 30) {
    candidates.push(...evaluateShopRules(input));

    const sourceCard = evaluateSourceRule(input);
    if (sourceCard) {
      candidates.push(sourceCard);
    }

    const landingCard = evaluateLandingRule(input);
    if (landingCard) {
      candidates.push(landingCard);
    }

    const validationCard = evaluateValidationRule(input);
    if (validationCard) {
      candidates.push(validationCard);
    }
  }

  candidates.push(...evaluateFulfillmentRules(input));

  const sorted = candidates.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence === "HIGH" ? -1 : 1;
    }
    return b.gap - a.gap;
  });

  return sorted.slice(0, 8).map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    confidence: candidate.confidence,
    evidence: candidate.evidence,
    possibleCauses: candidate.possibleCauses,
    recommendedChecks: candidate.recommendedChecks,
  }));
}
