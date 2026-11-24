/**
 * Owner decision: every visitor is measured. Neither a cookie-banner choice nor
 * a browser privacy signal (Global Privacy Control / Do Not Track) switches
 * measurement off. This one switch governs Meta, TikTok, Microsoft Clarity and
 * order-attribution storage.
 *
 * Rollback without code changes: set NEXT_PUBLIC_TRACK_ALL_VISITORS=false in
 * Vercel and redeploy. Tracking then waits for the visitor's saved choice again.
 * (The cookie notice has no choice buttons, so pair that with restoring them.)
 */
export function trackAllVisitors(): boolean {
  return process.env.NEXT_PUBLIC_TRACK_ALL_VISITORS !== "false";
}

/** A saved choice counts as agreement when it includes this kind of tracking. */
function agrees(choice: unknown, kind: "analytics" | "advertising"): boolean {
  return choice === "all" || choice === kind;
}

export function analyticsTrackingAllowed(choice: unknown): boolean {
  return trackAllVisitors() || agrees(choice, "analytics");
}

export function advertisingTrackingAllowed(choice: unknown): boolean {
  return trackAllVisitors() || agrees(choice, "advertising");
}

/** True when a browser privacy signal must stop tracking. Never, under the current policy. */
export function privacySignalStopsTracking(signalPresent: boolean): boolean {
  return !trackAllVisitors() && signalPresent;
}
