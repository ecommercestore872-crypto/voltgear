import React from "react";
import { cn } from "@/lib/utils";

interface RealisticBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ElementType;
  iconClassName?: string;
  variant?: "cyan" | "gold" | "glass" | "white";
}

export function RealisticBubble({
  icon: Icon,
  className,
  iconClassName,
  variant = "cyan",
  ...props
}: RealisticBubbleProps) {
  const variants = {
    cyan: "bg-gradient-to-b from-[#ffffff] to-[#e6f4f3] border-primary/20 shadow-[0_8px_16px_-6px_rgba(12,172,161,0.3),inset_0_2px_4px_rgba(255,255,255,1)]",
    gold: "bg-gradient-to-b from-[#ffffff] to-[#fffaf0] border-amber-300/40 shadow-[0_8px_16px_-6px_rgba(245,158,11,0.25),inset_0_2px_4px_rgba(255,255,255,1)]",
    glass:
      "bg-white/40 backdrop-blur-md border-white/60 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.1),inset_0_2px_6px_rgba(255,255,255,0.8)]",
    white:
      "bg-white border-border shadow-[0_8px_20px_-8px_rgba(0,0,0,0.12),inset_0_1px_3px_rgba(255,255,255,1)]",
  };

  const iconColors = {
    cyan: "text-primary",
    gold: "text-amber-500",
    glass: "text-foreground",
    white: "text-foreground",
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-2xl border transition-all duration-300 hover:scale-105",
        variants[variant],
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/40 to-white/70 opacity-50 pointer-events-none" />
      <Icon
        className={cn(
          "relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]",
          iconColors[variant],
          iconClassName,
        )}
        strokeWidth={2.5}
      />
    </div>
  );
}
