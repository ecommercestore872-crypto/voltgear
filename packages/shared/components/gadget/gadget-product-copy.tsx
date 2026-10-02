import Image from "next/image";
import type { PortableTextBlock } from "@portabletext/types";

import {
  displayHeading,
  portableTextToCopyBlocks,
  type CopySpan,
  type ProductCopyBlock,
} from "@/lib/product-detail-copy";
import { imageUrl } from "@/lib/sanity/image";
import { cn } from "@/lib/utils";

function CopySpans({ spans }: { spans: CopySpan[] }) {
  return (
    <>
      {spans.map((span, index) => {
        if (span.mark === "bold") {
          return (
            <strong key={index} className="gadget-copy-em">
              {span.text}
            </strong>
          );
        }
        if (span.mark === "italic") {
          return (
            <em key={index} className="gadget-copy-italic">
              {span.text}
            </em>
          );
        }
        return <span key={index}>{span.text}</span>;
      })}
    </>
  );
}

function CopyBlockView({
  block,
  index,
}: {
  block: ProductCopyBlock;
  index: number;
}) {
  const delay = `${Math.min(index, 8) * 70}ms`;

  if (block.type === "heading") {
    const Tag = block.level === 3 ? "h4" : "h3";
    return (
      <Tag
        className={cn(
          "gadget-copy-block",
          block.level === 3 ? "gadget-copy-h3" : "gadget-copy-h2",
        )}
        style={{ animationDelay: delay }}
      >
        {displayHeading(block.text)}
      </Tag>
    );
  }

  if (block.type === "lead") {
    return (
      <p
        className="gadget-copy-block gadget-copy-lead"
        style={{ animationDelay: delay }}
      >
        <CopySpans spans={block.spans} />
      </p>
    );
  }

  if (block.type === "callout") {
    return (
      <aside
        className="gadget-copy-block gadget-copy-callout"
        style={{ animationDelay: delay }}
      >
        <CopySpans spans={block.spans} />
      </aside>
    );
  }

  if (block.type === "image") {
    const src = imageUrl(block.url, { w: 1000 });
    if (!src) return null;
    if (block.width && block.height) {
      return (
        <figure
          className="gadget-copy-block gadget-copy-figure"
          style={{ animationDelay: delay }}
        >
          <Image
            src={src}
            alt={block.alt ?? ""}
            width={block.width}
            height={block.height}
            className="h-auto w-full rounded-xl border border-[color-mix(in_srgb,var(--g-sage)_28%,var(--g-line))]"
            sizes="(max-width: 768px) 100vw, 700px"
          />
        </figure>
      );
    }
    return (
      <figure
        className="gadget-copy-block gadget-copy-figure relative my-2 aspect-video w-full overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--g-sage)_28%,var(--g-line))] bg-[color-mix(in_srgb,var(--g-sage)_12%,var(--g-cream))]"
        style={{ animationDelay: delay }}
      >
        <Image
          src={src}
          alt={block.alt ?? ""}
          fill
          className="object-contain"
          sizes="700px"
        />
      </figure>
    );
  }

  if (block.type === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <ListTag
        className={cn(
          "gadget-copy-block",
          block.ordered ? "gadget-copy-ol" : "gadget-copy-ul",
        )}
        style={{ animationDelay: delay }}
      >
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>
            <CopySpans spans={item} />
          </li>
        ))}
      </ListTag>
    );
  }

  return (
    <p
      className="gadget-copy-block gadget-copy-p"
      style={{ animationDelay: delay }}
    >
      <CopySpans spans={block.spans} />
    </p>
  );
}

export function GadgetProductCopy({
  blocks,
  parsed,
}: {
  blocks?: PortableTextBlock[];
  parsed?: ProductCopyBlock[];
}) {
  const copy = parsed ?? (blocks ? portableTextToCopyBlocks(blocks) : []);
  if (copy.length === 0) return null;

  return (
    <div className="gadget-copy">
      {copy.map((block, index) => (
        <CopyBlockView
          key={`${block.type}-${index}`}
          block={block}
          index={index}
        />
      ))}
    </div>
  );
}
