import type { Product } from "@/lib/types";
import type { ProductDocument, PublishStatus } from "@/lib/db/publish";

export type AdminProduct = Product & {
  status: PublishStatus;
  draft: ProductDocument | null;
  costPrice?: number;
};
