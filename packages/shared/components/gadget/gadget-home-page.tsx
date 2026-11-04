import { Suspense } from "react";

import { GadgetHomeHero } from "@/components/gadget/gadget-home-hero";
import { GadgetHomeSections } from "@/components/gadget/gadget-home-sections";
import { GadgetHomeTrust } from "@/components/gadget/gadget-home-trust";
import { loadStorefrontSettings } from "@/lib/db/storefront-shell";

/** Shared Biometic homepage used by live `/`. */
export async function GadgetHomePage() {
  // Put the real banner in the page's first HTML, including ISR regeneration.
  // Only the heavier below-the-fold catalog remains independently streamed.
  const [hero, settings] = await Promise.all([
    GadgetHomeHero(),
    loadStorefrontSettings().catch(() => null),
  ]);
  return (
    // Keep the footer below the viewport while lower sections stream in.
    <div className="min-h-dvh text-[var(--g-charcoal)]">
      {hero}
      <GadgetHomeTrust settings={settings} />
      <Suspense fallback={null}>
        <GadgetHomeSections />
      </Suspense>
    </div>
  );
}
