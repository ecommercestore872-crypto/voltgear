"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContentBlock } from "@/lib/types";

function emptyBlock(type: ContentBlock["_type"]): ContentBlock {
  if (type === "heading") return { _type: "heading", level: "h2", text: "" };
  if (type === "list") return { _type: "list", type: "bullet", items: [""] };
  if (type === "faq") return { _type: "faq", items: [{ question: "", answer: "" }] };
  if (type === "callout") return { _type: "callout", title: "", text: "" };
  if (type === "cta") return { _type: "cta", label: "Shop the collection", href: "/products" };
  return { _type: "paragraph", text: "" };
}

export function BlogSectionEditor({
  sections,
  onChange,
}: {
  sections: ContentBlock[];
  onChange: (sections: ContentBlock[]) => void;
}) {
  function update(index: number, next: ContentBlock) {
    onChange(sections.map((block, i) => (i === index ? next : block)));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const copy = [...sections];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Guide body</Label>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["paragraph", "Paragraph"],
              ["heading", "Heading"],
              ["list", "List"],
              ["faq", "FAQ"],
              ["callout", "Callout"],
              ["cta", "Shop button"],
            ] as const
          ).map(([type, label]) => (
            <Button
              key={type}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange([...sections, emptyBlock(type)])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
          Add headings, paragraphs, lists, and an FAQ. Search and AdSense both want a real guide, not a thin blurb.
        </p>
      ) : null}

      <ul className="space-y-4">
        {sections.map((block, index) => (
          <li key={`${block._type}-${index}`} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {block._type}
              </p>
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" aria-label="Move up" onClick={() => move(index, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Move down" onClick={() => move(index, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove section"
                  onClick={() => onChange(sections.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {block._type === "heading" ? (
              <div className="grid gap-2 sm:grid-cols-[7rem_1fr]">
                <select
                  className="flex h-11 rounded-md border border-input bg-background px-3 text-sm"
                  value={block.level ?? "h2"}
                  onChange={(e) =>
                    update(index, { ...block, level: e.target.value as "h2" | "h3" | "h4" })
                  }
                >
                  <option value="h2">H2</option>
                  <option value="h3">H3</option>
                </select>
                <Input
                  value={block.text ?? ""}
                  onChange={(e) => update(index, { ...block, text: e.target.value })}
                  placeholder="Section heading"
                />
              </div>
            ) : null}

            {block._type === "paragraph" || block._type === "quote" ? (
              <Textarea
                rows={5}
                value={block.text ?? ""}
                onChange={(e) => update(index, { ...block, text: e.target.value })}
                placeholder="Write like you are talking to a shopper in Karachi or Lahore."
              />
            ) : null}

            {block._type === "list" ? (
              <Textarea
                rows={5}
                value={(block.items ?? []).join("\n")}
                onChange={(e) =>
                  update(index, {
                    ...block,
                    items: e.target.value.split("\n"),
                  })
                }
                placeholder="One point per line"
              />
            ) : null}

            {block._type === "callout" ? (
              <div className="space-y-2">
                <Input
                  value={block.title ?? ""}
                  onChange={(e) => update(index, { ...block, title: e.target.value })}
                  placeholder="Callout title"
                />
                <Textarea
                  rows={3}
                  value={block.text ?? ""}
                  onChange={(e) => update(index, { ...block, text: e.target.value })}
                />
              </div>
            ) : null}

            {block._type === "cta" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={block.label ?? ""}
                  onChange={(e) => update(index, { ...block, label: e.target.value })}
                  placeholder="Button label"
                />
                <Input
                  value={block.href ?? ""}
                  onChange={(e) => update(index, { ...block, href: e.target.value })}
                  placeholder="/products/earbuds"
                />
              </div>
            ) : null}

            {block._type === "faq" ? (
              <div className="space-y-3">
                {(block.items ?? []).map((item, fi) => (
                  <div key={fi} className="space-y-2 rounded-md bg-muted/40 p-2">
                    <Input
                      value={item.question}
                      onChange={(e) => {
                        const items = [...(block.items ?? [])];
                        items[fi] = { ...items[fi], question: e.target.value };
                        update(index, { ...block, items });
                      }}
                      placeholder="Question people type into Google"
                    />
                    <Textarea
                      rows={3}
                      value={item.answer}
                      onChange={(e) => {
                        const items = [...(block.items ?? [])];
                        items[fi] = { ...items[fi], answer: e.target.value };
                        update(index, { ...block, items });
                      }}
                      placeholder="Direct answer in two or three sentences"
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    update(index, {
                      ...block,
                      items: [...(block.items ?? []), { question: "", answer: "" }],
                    })
                  }
                >
                  Add question
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
