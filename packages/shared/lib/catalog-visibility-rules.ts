/**
 * Category visibility resolution states.
 *
 * Distinguishes between:
 * 1. "configured": Category records exist in the database.
 *    - activeSlugs: Set of category slugs that have active: true
 *    - allConfiguredSlugs: Set of all category slugs defined in the database
 *    - Zero active categories occurs when allConfiguredSlugs.size > 0 but activeSlugs.size === 0.
 * 2. "unconfigured": The categories table has 0 rows (unconfigured store / fresh install).
 * 3. "query_failure": The database query failed (network timeout, Postgres error, etc.).
 */
export type CategoryVisibilityResolution =
  | {
      readonly status: "configured";
      readonly activeSlugs: ReadonlySet<string>;
      readonly allConfiguredSlugs: ReadonlySet<string>;
    }
  | {
      readonly status: "unconfigured";
    }
  | {
      readonly status: "query_failure";
      readonly error?: unknown;
    };

/**
 * Raw JSON-serializable category visibility state.
 * Required for Next.js unstable_cache which serializes cache values via JSON.
 */
export type RawCategoryVisibilityData =
  | {
      readonly status: "configured";
      readonly activeSlugs: string[];
      readonly allConfiguredSlugs: string[];
    }
  | {
      readonly status: "unconfigured";
    }
  | {
      readonly status: "query_failure";
      readonly errorMessage: string;
    };

/**
 * Pure function: resolve category visibility from raw database rows or a query error.
 */
export function resolveCategoryVisibility(
  rows: Array<{ slug?: unknown; active?: unknown }> | null | undefined,
  queryError?: unknown,
): CategoryVisibilityResolution {
  if (queryError) {
    return { status: "query_failure", error: queryError };
  }
  if (!rows || rows.length === 0) {
    return { status: "unconfigured" };
  }

  const activeSlugs = new Set<string>();
  const allConfiguredSlugs = new Set<string>();

  for (const r of rows) {
    const slug = String(r.slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    allConfiguredSlugs.add(slug);
    if (r.active === true) {
      activeSlugs.add(slug);
    }
  }

  if (allConfiguredSlugs.size === 0) {
    return { status: "unconfigured" };
  }

  return {
    status: "configured",
    activeSlugs,
    allConfiguredSlugs,
  };
}

/**
 * Convert JSON-serializable raw data to CategoryVisibilityResolution with Sets.
 */
export function parseRawCategoryVisibility(
  raw: RawCategoryVisibilityData | null | undefined,
): CategoryVisibilityResolution {
  if (!raw || raw.status === "unconfigured") {
    return { status: "unconfigured" };
  }
  if (raw.status === "query_failure") {
    return { status: "query_failure", error: new Error(raw.errorMessage) };
  }
  return {
    status: "configured",
    activeSlugs: new Set(raw.activeSlugs.map((s) => s.toLowerCase())),
    allConfiguredSlugs: new Set(raw.allConfiguredSlugs.map((s) => s.toLowerCase())),
  };
}

/**
 * A configured category is public only while it remains active in the CMS.
 *
 * Rules:
 * - configured with active categories:
 *   - if category is provided: returns true only if category is in activeSlugs.
 *   - if category is null or blank: returns false (products without valid category are excluded).
 *   - if category is undefined (general catalog check): returns true since active categories exist.
 * - configured with zero active categories:
 *   - always returns false (store has no active categories; hides products and category PLPs).
 * - unconfigured:
 *   - returns true (store has no category constraints configured).
 * - query_failure:
 *   - returns false (fail-safe: prevents leaking unverified/inactive category URLs).
 */
export function categoryIsStorefrontVisible(
  category: string | undefined | null,
  active: ReadonlySet<string> | CategoryVisibilityResolution | null,
): boolean {
  // If active is a CategoryVisibilityResolution object
  if (active && typeof active === "object" && "status" in active) {
    if (active.status === "query_failure") {
      return false; // Fail safe
    }
    if (active.status === "unconfigured") {
      return true; // No categories configured
    }
    // status === "configured"
    if (active.activeSlugs.size === 0) {
      return false; // All categories disabled
    }
    if (category === undefined) {
      return true; // General catalog check with active categories present
    }
    if (category === null) {
      return false; // Product has no category assigned
    }
    const normalized = category.trim().toLowerCase();
    if (!normalized) return false;
    return active.activeSlugs.has(normalized);
  }

  // If active is a Set
  if (active instanceof Set) {
    if (active.size === 0) {
      return false; // Empty set = zero active categories
    }
    if (category === undefined) {
      return true;
    }
    if (category === null) {
      return false;
    }
    const normalized = category.trim().toLowerCase();
    if (!normalized) return false;
    return active.has(normalized);
  }

  // If active is null (unconfigured fallback)
  return true;
}
