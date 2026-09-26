/**
 * Single storefront search-executed hook.
 * Call only when a search has actually been executed (results URL with q),
 * not on keystrokes. Dedupes React remount / double-effect for the same query.
 */

try {
    trackTikTokSearch(q);
  } catch {
    // fail-open
  }
  return true;
}

recordStorefrontSearch.reset = () => recent.clear();

