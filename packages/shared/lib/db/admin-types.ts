import type { Product } from "@/lib/types";
import type { ProductDocument, PublishStatus } from "@/lib/db/publish";

export type AdminProduct = Product & {
  status: PublishStatus;
  draft: ProductDocument | null;
  /** Set on grid/search lists when draft JSON is omitted for payload size. */
  hasUnpublishedDraft?: boolean;
  costPrice?: number;
  adminRevision?: string;
  inventoryRevision?: string;
  membershipRevision?: string;
  /** Loaded together with revision by the editor snapshot RPC, never a separate fallback read. */
  manualCollectionIds?: string[];
};
