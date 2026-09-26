import { Suspense } from "react";

import {
  GadgetHomeHero,
  GadgetHomeHeroFallback,
} from "@/components/gadget/gadget-home-hero";
import { GadgetHomeSections } from "@/components/gadget/gadget-home-sections";

/** Shared Biometic homepage used by live `/` (and formerly `/home2`). */
export function GadgetHomePage() {
  return (
    <div className="text-[var(--g-charcoal)]">
      <Suspense fallback={<GadgetHomeHeroFallback />}>
        <GadgetHomeHero />
      </Suspense>
      <Suspense fallback={null}>
        <GadgetHomeSections />
      </Suspense>
    </div>
  );
}
