/**
 * Classify browser console noise for the mocked COD Playwright gate.
 * Intentional intercepted /api/checkout 409/429/500 fulfills may surface as
 * Chromium "Failed to load resource" console errors — those are expected only
 * when matched 1:1 against recorded checkout mock statuses.
 */

const FAILED_RESOURCE_RE =
  /Failed to load resource: the server responded with a status of (\d{3})/i;

export function isCheckoutApiUrl(url) {
  try {
    const path = new URL(url, "https://example.invalid").pathname;
    return /\/api\/checkout\/?$/i.test(path) || /\/api\/checkout\?/i.test(url);
  } catch {
    return /\/api\/checkout/i.test(url);
  }
}

export function parseFailedResourceStatus(text) {
  const match = FAILED_RESOURCE_RE.exec(text);
  if (!match) return null;
  const status = Number(match[1]);
  return Number.isFinite(status) ? status : null;
}

export function isBenignThirdPartyConsoleNoise(text) {
  return /favicon|tiktok|facebook|clarity|gtag|adsbygoogle|googletagmanager|vercel\.com\/sso/i.test(
    text,
  );
}

export function isFailedResourceConsoleMessage(text) {
  return FAILED_RESOURCE_RE.test(text);
}

/**
 * Build a multiset of expected statuses from intercepted checkout fulfills.
 * Only 409/429/500 against checkout URLs count.
 */
export function expectedStatusBag(expected) {
  const bag = new Map();
  for (const item of expected ?? []) {
    if (![409, 429, 500].includes(item.status)) continue;
    if (!isCheckoutApiUrl(item.url)) continue;
    bag.set(item.status, (bag.get(item.status) ?? 0) + 1);
  }
  return bag;
}

/**
 * Consume expected checkout HTTP error console messages against the multiset
 * of intercepted /api/checkout mock statuses. Does not globally ignore all
 * 409/429/500 messages — extras or unmatched resource failures remain unexpected.
 * Non-resource console errors (and JS exceptions) always fail.
 */
export function classifyCheckoutConsoleErrors(consoleMessages, expected) {
  const remaining = expectedStatusBag(expected);
  const unexpected = [];
  const matchedExpectedStatuses = [];

  for (const raw of consoleMessages ?? []) {
    const text = String(raw ?? "");
    if (!text.trim()) continue;
    if (isBenignThirdPartyConsoleNoise(text)) continue;

    const status = parseFailedResourceStatus(text);
    if (status != null && isFailedResourceConsoleMessage(text)) {
      const left = remaining.get(status) ?? 0;
      if (left > 0) {
        remaining.set(status, left - 1);
        matchedExpectedStatuses.push(status);
        continue;
      }
      unexpected.push(text);
      continue;
    }

    unexpected.push(text);
  }

  /** @type {Record<string, number>} */
  const remainingExpected = {};
  for (const [status, count] of remaining) {
    if (count > 0) remainingExpected[String(status)] = count;
  }

  return { unexpected, matchedExpectedStatuses, remainingExpected };
}
