import { Suspense } from "react";

import { GadgetHomeHero } from "@/components/gadget/gadget-home-hero";
import { GadgetHomeSections } from "@/components/gadget/gadget-home-sections";

/** Shared Biometic homepage used by live `/`. */
export async function GadgetHomePage() {
  // Put the real banner in the page's first HTML, including ISR regeneration.
  // Only the heavier below-the-fold catalog remains independently streamed.
  const hero = await GadgetHomeHero();
  return (
    <div className="text-[var(--g-charcoal)]">
      {hero}
      <Suspense fallback={null}>
        <GadgetHomeSections />
      </Suspense>
    </div>
  );
}
