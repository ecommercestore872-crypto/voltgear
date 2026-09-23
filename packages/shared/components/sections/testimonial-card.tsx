import { BadgeCheck, Quote } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/product/star-rating";
import type { Testimonial } from "@/lib/types";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card className="relative flex h-full flex-col gap-4 p-6">
      <Quote className="absolute right-6 top-6 h-8 w-8 text-primary/15" />
      <StarRating rating={testimonial.rating} size={18} />
      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
        &ldquo;{testimonial.reviewText}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div>
          <p className="flex items-center gap-1 text-sm font-medium">
            {testimonial.customerName}
            {testimonial.verified && (
              <BadgeCheck className="h-4 w-4 text-primary" />
            )}
          </p>
          {testimonial.product && (
            <p className="text-xs text-muted-foreground">
              Purchased: {testimonial.product}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
