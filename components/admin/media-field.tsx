"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { adminUpload } from "./admin-fetch";
import { isProductImageTooSmall } from "@/lib/product-image";

export function MediaField({
  label,
  urls,
  onChange,
  accept = "image/*",
  hint,
}: {
  label: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  accept?: string;
  hint?: string;
}) {
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setWarn(null);
    try {
      const json = await adminUpload(file);
      onChange([...urls, json.secureUrl]);
      if (accept.startsWith("image") && isProductImageTooSmall(json.width, json.height)) {
        setWarn(
          "This photo is smaller than 800 × 800. It may look blurry. Use a square 2048 × 2048 photo for a sharp result."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function addPaste() {
    const url = paste.trim();
    if (!url) return;
    onChange([...urls, url]);
    setPaste("");
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...urls];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      <div className="space-y-2">
        {urls.map((url, i) => (
          <div key={`${url}-${i}`} className="flex items-center gap-2">
            {accept.startsWith("image") ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={url} alt="" className="h-12 w-12 rounded object-cover" />
            ) : null}
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{url}</p>
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
              onClick={() => onChange(urls.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="file"
          accept={accept}
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Paste URL"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={addPaste}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
      {warn ? <p className="text-sm text-amber-700">{warn}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
