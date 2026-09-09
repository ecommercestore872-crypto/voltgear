import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function StarRating({
  rating = 0,
  className,
  size = 16,
}: {
  rating?: number;
  className?: string;
  size?: number;
}) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const fill = Math.max(0, Math.min(1, rating - (i - 1)));
    stars.push(
      <span key={i} className="relative inline-block">
        <Star
          className="text-muted-foreground/30"
          style={{ width: size, height: size }}
          fill="currentColor"
          strokeWidth={0}
        />
        {fill >= 0.5 && (
          <span
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${fill * 100}%` }}
          >
            <Star
              className="fill-amber-400 text-amber-400"
              style={{ width: size, height: size }}
              strokeWidth={0}
            />
          </span>
        )}
      </span>,
    );
  }
  return (
    <div className={cn("flex items-center gap-0.5", className)}>{stars}</div>
  );
}
