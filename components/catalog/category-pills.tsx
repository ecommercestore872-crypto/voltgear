import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FALLBACK_SHOP_TYPES, type ShopType } from "@/lib/categories";

export function CategoryPills({
  basePath = "/products",
  selected,
  counts,
  shopTypes = FALLBACK_SHOP_TYPES,
}: {
  basePath?: string;
  selected?: string | null;
  counts: Record<string, number>;
  shopTypes?: ShopType[];
}) {
  return (
    <nav
      aria-label="Product categories"
      className="mb-6 flex flex-wrap items-center gap-2"
    >
      <Button asChild variant={selected ? "outline" : "default"}>
        <Link href={basePath.startsWith("/products/") ? "/products" : basePath}>
          All Products
        </Link>
      </Button>
      {shopTypes.map((cat) => (
        <Button
          key={cat.slug}
          asChild
          variant={selected === cat.slug ? "default" : "outline"}
        >
          <Link href={`/products/${cat.slug}`}>
            {cat.name}{" "}
            <span className="ml-1 text-xs opacity-60">
              ({counts[cat.slug] ?? 0})
            </span>
          </Link>
        </Button>
      ))}
    </nav>
  );
}
