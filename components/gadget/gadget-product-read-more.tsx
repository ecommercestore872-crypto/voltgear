"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { GadgetProductCopy } from "@/components/gadget/gadget-product-copy";
import {
  portableTextToCopyBlocks,
  previewProductCopy,
} from "@/lib/product-detail-copy";
import type { PortableTextBlock } from "@portabletext/types";

export function GadgetProductReadMore({ blocks }: { blocks: PortableTextBlock[] }) {
  const copy = portableTextToCopyBlocks(blocks);
  const preview = previewProductCopy(copy);
  const [expanded, setExpanded] = useState(false);

  if (copy.length === 0) return null;

  return (
    <div className="gadget-copy-peek">
      <p className="gadget-eyebrow">Full details</p>
      <div className={expanded ? "mt-3" : "gadget-copy-peek-body mt-3"}>
        <GadgetProductCopy parsed={expanded || !preview.hasMore ? copy : preview.blocks} />
      </div>
      {preview.hasMore ? (
        <button
          type="button"
          className="gadget-copy-more"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown className={expanded ? "h-4 w-4 rotate-180" : "h-4 w-4"} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
