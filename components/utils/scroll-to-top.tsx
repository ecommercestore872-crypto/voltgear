"use client";

import { useEffect } from "react";

/**
 * Mounts invisibly at the top of a page and immediately resets scroll
 * to (0, 0) on first render. Solves the Next.js App Router issue where
 * `router.push()` can carry the previous page's scroll offset into the
 * new route, causing the page to appear mid-scroll and then snap up.
 */
export function ScrollToTop() {
  useEffect(() => {
    // Use "instant" so there is no visible jump — the scroll is already
    // at 0 from the server render; this just locks it in on the client.
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return null;
}
