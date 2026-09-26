/** Query keys removed from the address bar after capture (SEO/share friendly). */
export const MARKETING_QUERY_PARAMS = [
  "srsltid",
  "gclid",
  "fbclid",
  "ttclid",
  "msclkid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
] as const;

export function stripMarketingQueryFromSearch(search: string): string {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw.trim()) return "";
  const params = new URLSearchParams(raw);
  for (const key of MARKETING_QUERY_PARAMS) {
    params.delete(key);
  }
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function cleanedPathnameAndSearch(
  pathname: string,
  searchWithOptionalQuestion: string,
): string {
  const cleanSearch = stripMarketingQueryFromSearch(searchWithOptionalQuestion);
  return `${pathname}${cleanSearch}`;
}
