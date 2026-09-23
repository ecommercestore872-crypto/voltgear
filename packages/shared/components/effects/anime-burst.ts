"use client";

export function triggerCartParticleBurst(originX: number, originY: number) {
  if (typeof window === "undefined") return;

  const count = 24;
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:99999;";
  document.body.appendChild(container);

  const colors = [
    "#2563eb",
    "#3b82f6",
    "#60a5fa",
    "#00f0ff",
    "#a855f7",
    "#ffffff",
  ];

  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    const size = Math.floor(Math.random() * 6) + 4;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 120 + 30;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance - 40;

    p.style.cssText = `
      position: absolute;
      left: ${originX}px;
      top: ${originY}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${colors[i % colors.length]};
      box-shadow: 0 0 10px ${colors[i % colors.length]};
      transition: transform 0.75s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.75s ease-out;
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    `;
    container.appendChild(p);

    requestAnimationFrame(() => {
      p.style.transform = `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) scale(0)`;
      p.style.opacity = "0";
    });
  }

  setTimeout(() => {
    container.remove();
  }, 800);
}
