import Link from "next/link";

import { GadgetDealPair } from "@/components/gadget/gadget-deal-pair";
import { GadgetProductCard } from "@/components/gadget/gadget-product-card";
import { GadgetProductTabs } from "@/components/gadget/gadget-product-tabs";
import { ReviewsSection } from "@/components/product/product-info-sections";
import {
  applyGadgetStudioImages,
  applyGadgetStudioImagesList,
} from "@/lib/gadget-product-images";
import { products2Href } from "@/lib/gadget-preview";
import { localCatalogPreviewEnabled } from "@/lib/local-catalog-preview";
import { normalizeDealSlug, publicDealsForSlug } from "@/lib/db/deal-rules";
import {
  fetchDealCatalogForSlugs,
  listCachedDealsForProductSlug,
} from "@/lib/db/deal-store";
import { loadPdpProductDetailsBySlug } from "@/lib/db/product-pdp";
import {
  fetchCachedApprovedReviews,
  fetchCatalogProductsBySlugs,
  fetchRelatedProducts,
} from "@/lib/db/store";
import type { ApprovedReviewStats } from "@/lib/product-review-stats";
import type { Product } from "@/lib/types";

const RELATED_LIMIT = 4;

/** Below-fold PDP content — streams after buy box for faster mobile LCP. */
export async function GadgetPdpDeferred({
  product: productIn,
  reviewStats,
}: {
  product: Product;
  reviewStats: ApprovedReviewStats;
}) {
  const slugKey = normalizeDealSlug(productIn.slug);
  const preview = localCatalogPreviewEnabled();

  const [approvedReviews, deals, detailFields] = await Promise.all([
    preview ? Promise.resolve([]) : fetchCachedApprovedReviews(productIn._id).catch(() => []),
    preview ? Promise.resolve([]) : listCachedDealsForProductSlug(productIn.slug).catch(() => []),
    preview ? Promise.resolve(null) : loadPdpProductDetailsBySlug(productIn.slug).catch(() => null),
  ]);

  const slugsForDeals = new Set<string>([productIn.slug]);
  for (const deal of deals) {
    const a = normalizeDealSlug(deal.slugA);
    const b = normalizeDealSlug(deal.slugB);
    slugsForDeals.add(a === slugKey ? b : a);
  }

  const dealSlugs = [...slugsForDeals].filter((s) => s !== productIn.slug);

  const [dealCatalog, related, dealPartners] = await Promise.all([
    preview ? Promise.resolve([]) : fetchDealCatalogForSlugs([...slugsForDeals]).catch(() => []),
    fetchRelatedProducts(productIn._id, productIn.category, RELATED_LIMIT).catch(() => []),
    !preview && dealSlugs.length
      ? fetchCatalogProductsBySlugs(dealSlugs)
      : Promise.resolve([]),
  ]);

  const dealRows = publicDealsForSlug(productIn.slug, deals, dealCatalog);

  const dealPartnerBySlug = new Map(dealPartners.map((p) => [p.slug, p]));
  const pairBlocks = dealRows
    .map((row) => ({
      percentOff: row.percentOff,
      other: dealPartnerBySlug.get(row.otherSlug) ?? null,
    }))
    .filter((row): row is { percentOff: number; other: Product } =>
      Boolean(row.other),
    )
    .slice(0, 2);

  const seen = new Set<string>();
  const mergedReviews = [...approvedReviews, ...(productIn.reviews ?? [])].filter(
    (r) => {
      const key = `${(r.name ?? "").toLowerCase().trim()}|${(r.comment ?? "").toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
  );

  const enriched: Product = {
    ...productIn,
    ...(detailFields ?? {}),
    reviews: mergedReviews.length ? mergedReviews : productIn.reviews,
    reviewCount: reviewStats.count,
    rating: reviewStats.count > 0 ? reviewStats.averageRating : undefined,
  };
  let product = applyGadgetStudioImages(enriched);
  const relatedProducts = applyGadgetStudioImagesList(related);

  return (
    <div className="gadget-below-fold">
      {pairBlocks.map((row) => (
        <GadgetDealPair
          key={row.other.slug}
          percentOff={row.percentOff}
          other={row.other}
        />
      ))}
      <div className="mt-10 scroll-mt-24">
        <GadgetProductTabs product={product} />
      </div>
      <div className="mt-12 scroll-mt-24">
        <ReviewsSection
          product={product}
          reviews={product.reviews ?? []}
          rating={reviewStats.count > 0 ? reviewStats.averageRating : undefined}
          includeDemo={false}
        />
      </div>
      {relatedProducts.length ? (
        <section className="mt-14 pb-4">
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="gadget-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              You may also like
            </h2>
            <Link
              href={products2Href(product.category)}
              className="text-sm font-medium text-[var(--g-sage)] hover:text-[var(--g-forest)]"
            >
              View all
            </Link>
          </div>
          <div className="gadget-product-grid">
            {relatedProducts.map((p) => (
              <GadgetProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
      <section className="mt-16 border-t border-[var(--g-border)]/20 pt-10 pb-8">
        <h3 className="gadget-display mb-6 text-2xl font-semibold text-[var(--g-charcoal)]">
          Explore more at Buy n Try
        </h3>
        <div className="flex flex-wrap gap-3">
          {[
            { name: "Smartwatches", path: "/products/smartwatch" },
            { name: "Earbuds & audio", path: "/products/earbuds" },
            { name: "Power banks", path: "/products/power-bank" },
            { name: "Microphones", path: "/products/microphones" },
            { name: "Tripods", path: "/products/tripod" },
            { name: "Ring lights", path: "/products/ring-light" },
            { name: "Chargers", path: "/products/charger" },
          ].map((link) => (
            <Link
              key={link.name}
              href={link.path}
              className="rounded-full border border-[var(--g-line)] bg-[var(--g-white)] px-4 py-2 text-sm font-medium text-[var(--g-charcoal)] transition-colors hover:border-[var(--g-forest)] hover:bg-[var(--g-forest)] hover:text-white"
            >
              {link.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
