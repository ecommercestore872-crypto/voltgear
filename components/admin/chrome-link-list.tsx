"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChromeLink } from "@/lib/chrome-nav-rules";

export function ChromeLinkList({
  title,
  hint,
  links,
  onChange,
}: {
  title: string;
  hint?: string;
  links: ChromeLink[];
  onChange: (next: ChromeLink[]) => void;
}) {
  function patch(index: number, field: keyof ChromeLink, value: string) {
    onChange(links.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="sm:col-span-2 space-y-2">
      <Label>{title}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="space-y-2">
        {links.map((row, i) => (
          <div key={`${row.href}-${i}`} className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center">
            <Input
              aria-label={`${title} label ${i + 1}`}
              placeholder="Label"
              value={row.label}
              onChange={(e) => patch(i, "label", e.target.value)}
            />
            <Input
              aria-label={`${title} URL ${i + 1}`}
              placeholder="/page or https://…"
              value={row.href}
              onChange={(e) => patch(i, "href", e.target.value)}
            />
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label="Move up" onClick={() => move(i, -1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Move down" onClick={() => move(i, 1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove"
                onClick={() => onChange(links.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...links, { label: "", href: "" }])}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add link
      </Button>
    </div>
  );
}
