import Link from "next/link";

import { GadgetArrivalCard } from "@/components/gadget/gadget-arrival-card";
import type { Product } from "@/lib/types";

export function GadgetNewArrivals({
  products,
  title = "Best Sellers",
  viewAllHref = "/products",
  headingId,
  tone = "default",
  pickLabel,
}: {
  products: Product[];
  title?: string;
  viewAllHref?: string;
  headingId?: string;
  tone?: "default" | "clay" | "leaf";
  /** Badge shown on every product; only pass for admin-picked rails. */
  pickLabel?: string;
}) {
  const heading =
    headingId ||
    `rail-${
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "products"
    }`;

  const shown = products.slice(0, 6); // 2 columns x 3 rows on phones
  if (!shown.length) return null;

  return (
    <section
      className={
        tone === "clay"
          ? "gadget-band-clay px-3 py-8 sm:px-5 sm:py-10 lg:px-8"
          : tone === "leaf"
            ? "gadget-band-leaf px-3 py-8 sm:px-5 sm:py-10 lg:px-8"
            : "px-3 py-8 sm:px-5 sm:py-10 lg:px-8"
      }
      aria-labelledby={heading}
    >
      <div className="mx-auto max-w-6xl">
        <div className="login-section-head mb-5 sm:mb-7">
          <div>
            <p className="gadget-eyebrow mb-1.5">
              {tone === "clay" ? "Offers" : tone === "leaf" ? "Shop" : "Collection"}
            </p>
            <h2
              id={heading}
              className="login-section-title text-2xl sm:text-3xl"
            >
              {title}
            </h2>
          </div>
          <Link
            href={viewAllHref}
            className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-[13px] font-bold text-[var(--g-charcoal)] transition hover:bg-[var(--g-forest)] hover:text-white"
          >
            View all
          </Link>
        </div>

        <ul className="grid grid-cols-2 items-stretch gap-2.5 sm:grid-cols-3 sm:gap-4">
          {shown.map((product) => (
            <li key={product._id} className="flex min-w-0">
              <GadgetArrivalCard product={product} isGrid badgeTag={pickLabel} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
