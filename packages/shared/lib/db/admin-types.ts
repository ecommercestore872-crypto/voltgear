import type { Product } from "@/lib/types";
import type { ProductDocument, PublishStatus } from "@/lib/db/publish";

export type AdminProduct = Product & {
  status: PublishStatus;
  draft: ProductDocument | null;
  /** Set on grid/search lists when draft JSON is omitted for payload size. */
  hasUnpublishedDraft?: boolean;
  costPrice?: number;
};
