import { notFound } from "next/navigation";

import { loadPdpProductBySlug } from "@/lib/db/product-pdp";

/**
 * The page's loading.tsx starts streaming before the page runs, which would send HTTP 200
 * for a missing product. A layout sits above that boundary, so the 404 status is real.
 * loadPdpProductBySlug is cached, so the page reuses this lookup.
 */
export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadPdpProductBySlug(slug).catch(() => null);
  if (!product) notFound();
  return children;
}
