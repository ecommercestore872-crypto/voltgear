import Link from "next/link";

import { products2Href } from "@/lib/gadget-preview";

/** Server trust line before cart client hydrates (no duplicate h1). */
export function CartStaticShell() {
  return (
    <div className="border-b border-[var(--g-line)] bg-[var(--g-cream-deep)]">
      <div className="mx-auto max-w-6xl px-4 py-3 lg:px-8">
        <p className="text-center text-xs text-[var(--g-taupe)] sm:text-left sm:text-sm">
          Cash on delivery available ·{" "}
          <Link href={products2Href()} className="font-semibold text-[var(--g-forest)] hover:underline">
            Continue shopping
          </Link>
        </p>
      </div>
    </div>
  );
}
