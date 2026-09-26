/** Tag checkout steps in Clarity for funnel filters (when Clarity is loaded). */
export function tagCheckoutClarityStep(step: number) {
  if (typeof window === "undefined") return;
  const clarity = (window as Window & { clarity?: (...args: unknown[]) => void })
    .clarity;
  if (typeof clarity !== "function") return;
  try {
    clarity("set", "checkout_step", String(step));
  } catch {
    // fail-open
  }
}

export function tagCheckoutClarityEvent(name: "place_order_click" | "order_success") {
  if (typeof window === "undefined") return;
  const clarity = (window as Window & { clarity?: (...args: unknown[]) => void })
    .clarity;
  if (typeof clarity !== "function") return;
  try {
    clarity("event", name);
  } catch {
    // fail-open
  }
}
