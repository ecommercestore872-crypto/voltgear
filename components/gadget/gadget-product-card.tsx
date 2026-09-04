import { GadgetArrivalCard } from "@/components/gadget/gadget-arrival-card";
import type { Product } from "@/lib/types";

export function GadgetProductCard({ product }: { product: Product }) {
  return <GadgetArrivalCard product={product} isGrid />;
}
