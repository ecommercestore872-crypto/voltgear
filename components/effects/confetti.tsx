"use client";

import { useCallback, useRef } from "react";

export function useConfetti() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fire = useCallback((originX: number, originY: number) => {
    let container = containerRef.current;
    if (!container) {
      container = document.createElement("div");
      container.style.cssText =
        "position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden";
      document.body.appendChild(container);
      containerRef.current = container;
    }

    const PARTICLE_COUNT = 24;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const el = document.createElement("span");
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
      const distance = 60 + Math.random() * 100;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 40;
      const rotation = Math.random() * 720 - 360;
      const size = 6 + Math.random() * 6;

      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
      el.style.cssText = `
        position:absolute;
        left:${originX}px;
        top:${originY}px;
        width:${size}px;
        height:${size}px;
        background-color:${colors[i % 5]};
        border-radius:50%;
        pointer-events:none;
        will-change:transform,opacity;
        animation:confetti-burst 0.7s cubic-bezier(.25,.46,.45,.94) forwards;
        --dx:${dx}px;
        --dy:${dy}px;
        --rot:${rotation}deg;
      `;

      container.appendChild(el);
      setTimeout(() => el.remove(), 800);
    }
  }, []);

  return fire;
}

export function ConfettiStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@keyframes confetti-burst {
  0% { opacity:1; transform:translate(0,0) rotate(0deg) scale(1); }
  100% { opacity:0; transform:translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(0.3); }
}
`,
      }}
    />
  );
}
