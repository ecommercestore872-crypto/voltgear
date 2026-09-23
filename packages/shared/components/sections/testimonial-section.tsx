import { TestimonialCard } from "@/components/sections/testimonial-card";
import type { Testimonial } from "@/lib/types";

export function TestimonialSection({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  if (!testimonials.length) return null;

  return (
    <section className="border-b border-border/60 bg-secondary/30">
      <div className="container mx-auto max-w-screen-xl px-4 py-10 md:px-6 md:py-12 lg:px-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Customer Reviews
          </h2>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-none md:grid md:grid-cols-2 md:overflow-visible md:pb-0 md:snap-none lg:grid-cols-3">
          {testimonials.slice(0, 6).map((testimonial) => (
            <div
              key={`${testimonial.customerName}-${testimonial.reviewText.slice(0, 16)}`}
              className="w-[85%] max-w-xs shrink-0 snap-center sm:w-[55%] md:w-auto md:max-w-none"
            >
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
