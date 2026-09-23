"use client";

import { ConfettiStyles, useConfetti } from "./confetti";
import { FlyToCartStyles, useFlyToCart } from "./fly-to-cart";

let addEffectListeners = false;

export function CartEffects() {
  const fireConfetti = useConfetti();
  const flyToCart = useFlyToCart();

  if (!addEffectListeners && typeof window !== "undefined") {
    addEffectListeners = true;
    window.addEventListener(
      "voltgear:add-to-cart",
      ((e: CustomEvent) => {
        const { imageEl, originX, originY } = e.detail || {};
        if (imageEl) flyToCart(imageEl);
        else if (originX != null && originY != null)
          fireConfetti(originX, originY);
        else {
          const cartBtn = document.querySelector<HTMLElement>(
            'button[aria-label*="cart"]',
          );
          if (cartBtn) {
            const r = cartBtn.getBoundingClientRect();
            fireConfetti(r.left + r.width / 2, r.top + r.height / 2);
          }
        }
      }) as EventListener,
      { capture: true },
    );
  }

  return (
    <>
      <ConfettiStyles />
      <FlyToCartStyles />
    </>
  );
}

export function dispatchAddToCartEffect(
  imageEl?: HTMLImageElement | null,
  originX?: number,
  originY?: number,
) {
  window.dispatchEvent(
    new CustomEvent("voltgear:add-to-cart", {
      detail: { imageEl, originX, originY },
    }),
  );
}
