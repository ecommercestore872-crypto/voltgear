import { ChevronDown } from "lucide-react";

/** Native details/summary: the answers are in the server HTML, so crawlers and AI tools can read them. */
export function FAQAccordion({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <div className="mt-6 w-full">
      {items.map((item, i) => (
        <details key={i} className="group border-b">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between py-4 text-left font-medium hover:underline [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
