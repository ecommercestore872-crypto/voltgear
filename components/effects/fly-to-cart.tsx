"use client";

import { useCallback } from "react";

export function useFlyToCart() {
  const fly = useCallback(
    (imageEl: HTMLImageElement | HTMLDivElement | null) => {
      if (!imageEl) return;

      const cartBtn = document.querySelector<HTMLElement>(
        'button[aria-label*="cart"]',
      );
      if (!cartBtn) return;

      const imgRect = imageEl.getBoundingClientRect();
      const cartRect = cartBtn.getBoundingClientRect();

      const startX = imgRect.left + imgRect.width / 2;
      const startY = imgRect.top + imgRect.height / 2;
      const endX = cartRect.left + cartRect.width / 2;
      const endY = cartRect.top + cartRect.height / 2;

      const ghost = document.createElement("div");
      ghost.style.cssText = `
        position:fixed;
        left:${startX - 20}px;
        top:${startY - 20}px;
        width:40px;
        height:40px;
        border-radius:50%;
        background:hsl(var(--primary));
        z-index:99998;
        pointer-events:none;
        will-change:transform,opacity;
        animation:fly-to-cart 0.55s cubic-bezier(.34,1.56,.64,1) forwards;
        --startX:0px;
        --startY:0px;
        --endX:${endX - startX}px;
        --endY:${endY - startY}px;
        opacity:0.9;
        box-shadow:0 2px 12px rgba(0,0,0,0.2);
      `;

      document.body.appendChild(ghost);

      cartBtn.classList.add("cart-bounce");
      setTimeout(() => cartBtn.classList.remove("cart-bounce"), 600);

      setTimeout(() => ghost.remove(), 600);
    },
    [],
  );

  return fly;
}

export function FlyToCartStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@keyframes fly-to-cart {
  0% {
    transform: translate(0,0) scale(1);
    opacity: 0.9;
  }
  50% {
    transform: translate(calc(var(--endX) * 0.5), calc(var(--endY) * 0.5 - 60px)) scale(0.6);
    opacity: 0.7;
  }
  100% {
    transform: translate(var(--endX), var(--endY)) scale(0.15);
    opacity: 0;
  }
}
@keyframes cart-bounce {
  0%, 100% { transform: scale(1); }
  30% { transform: scale(1.3); }
  60% { transform: scale(0.9); }
}
.cart-bounce {
  animation: cart-bounce 0.5s cubic-bezier(.34,1.56,.64,1);
}
`,
      }}
    />
  );
}
