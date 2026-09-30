import { getStockState } from "@/lib/stock";
import type { PublicSiteConfig } from "@/lib/site-config";
import type { Product } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

/** Server-rendered price + availability for crawlers and fast first paint. */
export function GadgetPdpServerFacts({
  product,
  config,
}: {
  product: Product;
  config: PublicSiteConfig;
}) {
  const stock = getStockState(product.stockStatus);
  const compareAt =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? product.compareAtPrice
      : null;

  return (
    <div className="sr-only">
      <p>{product.name}</p>
      <p>
        Price: {formatPrice(product.price)}
        {config.currency ? ` ${config.currency}` : ""}
      </p>
      {compareAt ? <p>Was: {formatPrice(compareAt)}</p> : null}
      <p className={cn(stock.soldOut && "text-red-700")}>{stock.label}</p>
    </div>
  );
}
