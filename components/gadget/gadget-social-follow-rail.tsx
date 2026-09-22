import { ArrowUpRight } from "lucide-react";

import { GadgetSocialGlyph } from "@/components/gadget/gadget-social-glyphs";
import type { PublicSocialLink } from "@/lib/social-links-rules";

const CARD_STYLES: Record<
  PublicSocialLink["id"],
  { ring: string; bg: string; glow: string }
> = {
  instagram: {
    ring: "ring-[color-mix(in_srgb,#DD2A7B_35%,var(--g-line))]",
    bg: "bg-[linear-gradient(135deg,color-mix(in_srgb,#F58529_12%,white),color-mix(in_srgb,#DD2A7B_10%,white))]",
    glow: "group-hover:shadow-[0_12px_28px_rgba(221,42,123,0.22)]",
  },
  tiktok: {
    ring: "ring-[color-mix(in_srgb,#25F4EE_40%,var(--g-line))]",
    bg: "bg-[linear-gradient(135deg,color-mix(in_srgb,#25F4EE_14%,white),color-mix(in_srgb,#FE2C55_10%,white))]",
    glow: "group-hover:shadow-[0_12px_28px_rgba(37,244,238,0.2)]",
  },
  facebook: {
    ring: "ring-[color-mix(in_srgb,#1877F2_35%,var(--g-line))]",
    bg: "bg-[linear-gradient(135deg,color-mix(in_srgb,#1877F2_12%,white),color-mix(in_srgb,var(--g-sage)_15%,white))]",
    glow: "group-hover:shadow-[0_12px_28px_rgba(24,119,242,0.2)]",
  },
};

export function GadgetSocialFollowRail({ links }: { links: PublicSocialLink[] }) {
  if (links.length === 0) return null;

  return (
    <section
      className="px-3 pb-1 pt-2 sm:px-4 lg:px-8"
      aria-labelledby="social-follow-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-[color-mix(in_srgb,var(--g-sage)_30%,var(--g-line))] bg-[color-mix(in_srgb,var(--g-blush)_50%,white)] px-5 py-5 shadow-[0_8px_32px_rgba(31,54,38,0.07)] sm:px-7 sm:py-6">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--g-amber)_25%,transparent)_0%,transparent_70%)]"
            aria-hidden
          />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-md text-center lg:text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--g-amber-text)]">
                Behind the drops
              </p>
              <h2
                id="social-follow-heading"
                className="mt-1 text-lg font-bold tracking-tight text-[var(--g-charcoal)] sm:text-xl"
              >
                Watch unboxings and deals on our feeds
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--g-charcoal)]/75">
                Real COD orders, honest reviews, and flash offers. Follow before you checkout.
              </p>
            </div>

            <ul className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-end">
              {links.map((link) => {
                const style = CARD_STYLES[link.id];
                return (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex min-h-[3.25rem] min-w-[11.5rem] items-center gap-3 rounded-2xl border border-transparent px-4 py-2.5 ring-1 transition duration-300 hover:-translate-y-0.5 ${style.ring} ${style.bg} ${style.glow}`}
                    >
                      <span className="shrink-0 rounded-xl bg-white/70 p-1 shadow-sm">
                        <GadgetSocialGlyph platform={link.id} className="h-8 w-8" />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block text-[13px] font-bold text-[var(--g-charcoal)]">
                          {link.label}
                        </span>
                        <span className="block truncate text-[11px] font-medium text-[var(--g-charcoal)]/65">
                          {link.handle}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-[var(--g-forest)] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                        aria-hidden
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}