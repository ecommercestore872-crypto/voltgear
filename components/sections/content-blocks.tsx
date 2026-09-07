import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Lightbulb, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/sections/contact-form";
import { FAQAccordion } from "@/components/sections/faq-accordion";
import { ProductCard } from "@/components/product/product-card";
import { safeBlogHref } from "@/lib/blog-safety-rules";
import { imageUrl } from "@/lib/sanity/image";
import type { ContentBlock } from "@/lib/types";

export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  if (!blocks?.length) return null;

  return (
    <div className="max-w-3xl">
      {blocks.map((block, i) => {
        switch (block._type) {
          case "heading":
            if (block.level === "h4") {
              return (
                <h4
                  key={i}
                  className="mt-6 text-lg font-bold tracking-tight text-[var(--g-charcoal,inherit)]"
                >
                  {block.text}
                </h4>
              );
            }
            return block.level === "h3" ? (
              <h3
                key={i}
                className="mt-8 text-xl font-bold tracking-tight text-[var(--g-charcoal,inherit)]"
              >
                {block.text}
              </h3>
            ) : (
              <h2
                key={i}
                className="mt-8 text-2xl font-bold tracking-tight text-[var(--g-charcoal,inherit)]"
              >
                {block.text}
              </h2>
            );
          case "paragraph":
            return (
              <p
                key={i}
                className="mt-4 leading-relaxed text-[var(--g-taupe,hsl(var(--muted-foreground)))]"
              >
                {block.text}
              </p>
            );
          case "list":
            if (!block.items?.length) return null;
            return block.type === "number" ? (
              <ol
                key={i}
                className="mt-4 list-decimal space-y-2 pl-5 text-[var(--g-taupe,hsl(var(--muted-foreground)))]"
              >
                {block.items.map((item, j) => (
                  <li key={j} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ol>
            ) : (
              <ul
                key={i}
                className="mt-4 list-disc space-y-2 pl-5 text-[var(--g-taupe,hsl(var(--muted-foreground)))]"
              >
                {block.items.map((item, j) => (
                  <li key={j} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "callout":
            return (
              <aside
                key={i}
                role="note"
                className="mt-6 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"
              >
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  {block.title && (
                    <p className="font-semibold text-[var(--g-charcoal,inherit)]">{block.title}</p>
                  )}
                  <p className="mt-0.5 text-sm leading-relaxed text-[var(--g-taupe,hsl(var(--muted-foreground)))]">
                    {block.text}
                  </p>
                </div>
              </aside>
            );
          case "relatedProducts":
            if (!block.products?.length) return null;
            return (
              <div key={i} className="mt-10">
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <ShoppingBag className="h-5 w-5 text-primary" aria-hidden />
                  {block.heading || "Related products"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <Check className="mr-1 inline h-3.5 w-3.5 text-primary" aria-hidden />
                  Pair them with your order — available in the store.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {block.products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              </div>
            );
          case "inlineImage":
            if (!block.image) return null;
            {
              const src = imageUrl(block.image, { w: 1000 });
              const d = block.dimensions;
              return d?.width && d?.height ? (
                <Image
                  key={i}
                  src={src}
                  alt=""
                  width={d.width}
                  height={d.height}
                  className="my-6 h-auto w-full rounded-xl border"
                  sizes="(max-width: 768px) 100vw, 700px"
                />
              ) : (
                <div
                  key={i}
                  className="relative my-6 aspect-video w-full overflow-hidden rounded-xl border bg-muted"
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-contain"
                    sizes="700px"
                  />
                </div>
              );
            }
          case "quote":
            return (
              <blockquote
                key={i}
                className="my-6 border-l-4 border-primary pl-4 text-lg font-medium italic text-foreground"
              >
                {block.text}
              </blockquote>
            );
          case "cta": {
            const href = safeBlogHref(block.href);
            if (!block.label || !href) return null;
            const internal = href.startsWith("/");
            return (
              <div key={i} className="mt-8">
                <Button asChild size="lg">
                  {internal ? (
                    <Link href={href}>
                      {block.label}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Link>
                  ) : (
                    <a href={href} rel="noopener noreferrer" target="_blank">
                      {block.label}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </a>
                  )}
                </Button>
              </div>
            );
          }
          case "faq":
            return block.items?.length ? (
              <section key={i} className="mt-8" aria-labelledby={`blog-faq-${i}`}>
                <h2
                  id={`blog-faq-${i}`}
                  className="text-2xl font-bold tracking-tight text-[var(--g-charcoal,inherit)]"
                >
                  Frequently asked questions
                </h2>
                <FAQAccordion items={block.items} />
              </section>
            ) : null;
          case "contactForm":
            return (
              <div key={i} className="mt-8">
                <ContactForm heading={block.heading} />
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
