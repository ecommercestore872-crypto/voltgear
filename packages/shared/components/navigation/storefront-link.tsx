import NextLink from "next/link";
import type { ComponentProps } from "react";

type StorefrontLinkProps = ComponentProps<typeof NextLink>;

/**
 * Shopper navigation link with data-saving defaults. Next's viewport prefetch
 * can download many routes a visitor never opens; click navigation remains
 * client-side, and a caller can still opt into prefetch for a measured funnel.
 */
export function StorefrontLink({
  prefetch = false,
  ...props
}: StorefrontLinkProps) {
  return <NextLink prefetch={prefetch} {...props} />;
}
