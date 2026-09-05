import Link from "next/link";
import type { ReactNode } from "react";

import { gadgetFontClass } from "@/components/gadget/gadget-fonts";

export function GadgetSupportLayout({
  eyebrow = "Care",
  title,
  description,
  children,
  related,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  related?: { href: string; label: string }[];
}) {
  return (
    <div className={`gadget-theme ${gadgetFontClass} bg-[var(--g-cream)] text-[var(--g-charcoal)]`}>
      <div className="border-b border-[var(--g-line)] bg-[var(--g-cream-deep)]">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10 lg:px-8">
          <p className="gadget-eyebrow">{eyebrow}</p>
          <h1 className="gadget-h1 mt-2 text-[var(--g-charcoal)]">{title}</h1>
          {description ? (
            <p className="gadget-body mt-3 max-w-xl sm:text-base">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10 lg:px-8">
        {children}
        {related && related.length > 0 ? (
          <nav
            aria-label="Related care pages"
            className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--g-line)] pt-8 text-sm"
          >
            {related.map((r) => (
              <Link
                key={r.href}
                href={r.href}
            className="inline-flex min-h-11 items-center font-medium text-[var(--g-forest)] hover:underline"
              >
                {r.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

export function GadgetSupportCard({
  id,
  icon,
  title,
  children,
}: {
  id?: string;
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
              className="scroll-mt-[calc(var(--g-header-offset,3.5rem)+1rem)] rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 text-[var(--g-forest)]">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--g-charcoal)]">{title}</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--g-taupe)]">{children}</div>
        </div>
      </div>
    </section>
  );
}
