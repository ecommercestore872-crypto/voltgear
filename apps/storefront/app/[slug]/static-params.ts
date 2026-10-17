const EXPLICIT_STOREFRONT_ROOT_SLUGS = new Set([
  "about",
  "blog",
  "bulk-order",
  "cart",
  "checkout",
  "compare",
  "contact",
  "cookies",
  "faq",
  "privacy-policy",
  "products",
  "search",
  "shipping-returns",
  "terms-of-service",
  "track",
  "warranty",
  "wishlist",
  "write-review",
]);

/** Prevent the root CMS catch-all from emitting paths owned by explicit app routes. */
export function isExplicitStorefrontRootSlug(slug: string): boolean {
  return EXPLICIT_STOREFRONT_ROOT_SLUGS.has(slug.trim().toLowerCase());
}

export function storefrontCmsStaticParams(
  pages: ReadonlyArray<{ pageType?: string | null; slug?: string | null }>,
): Array<{ slug: string }> {
  return pages.flatMap((page) => {
    const slug = page.slug?.trim();
    if (!slug || page.pageType === "blog" || isExplicitStorefrontRootSlug(slug)) {
      return [];
    }
    return [{ slug }];
  });
}
