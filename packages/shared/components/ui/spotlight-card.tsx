"use client";

import { useRef, useState } from "react";

export function SpotlightCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-xl ${className}`}
    >
      {/* Background Radial Glow */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, rgba(59, 130, 246, 0.08), transparent 40%)`,
        }}
      />
      {/* Border Radial Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl border border-primary/30 transition-opacity duration-300"
        style={{
          opacity,
          WebkitMaskImage: `radial-gradient(220px circle at ${position.x}px ${position.y}px, black 30%, transparent 80%)`,
          maskImage: `radial-gradient(220px circle at ${position.x}px ${position.y}px, black 30%, transparent 80%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
