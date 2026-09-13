"use client";

import { useState, useRef } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { adminUpload } from "./admin-fetch";
import { isProductImageTooSmall } from "@/lib/product-image";

export function MediaField({
  label,
  urls,
  onChange,
  onBusyChange,
  accept = "image/*,.heic,.heif",
  hint,
}: {
  label: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  onBusyChange?: (busy: boolean) => void;
  accept?: string;
  hint?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    setWarn(null);
    try {
      const json = await adminUpload(file);
      onChange([...urls, json.secureUrl]);
      if (
        accept.startsWith("image") &&
        isProductImageTooSmall(json.width, json.height)
      ) {
        setWarn(
          "This photo is smaller than 800 × 800. It may look blurry. Use a square 2048 × 2048 photo for a sharp result.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  async function handleRemove(index: number) {
    const targetUrl = urls[index];
    if (!targetUrl) return;

    // Delete from state immediately
    onChange(urls.filter((_, j) => j !== index));

    // Best effort delete from backend storage if it looks like a managed asset
    if (targetUrl.includes("/storage/v1/object/public/product-images/") || targetUrl.includes("res.cloudinary.com/")) {
      try {
        await fetch(`/api/admin/upload?url=${encodeURIComponent(targetUrl)}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Failed to delete unused media asset from server:", err);
      }
    }
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
              <img
                src={url}
                alt=""
                className="h-12 w-12 rounded object-cover"
              />
            ) : null}
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {url}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Move up"
              onClick={() => move(i, -1)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Move down"
              onClick={() => move(i, 1)}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove"
              onClick={() => handleRemove(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 shadow-sm"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {busy ? "Uploading..." : "Upload File"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            disabled={busy}
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">or paste link:</span>
        </div>
        <div className="flex flex-1 gap-2 w-full min-w-0">
          <Input
            placeholder="https://..."
            value={paste}
            className="min-w-0 shadow-sm"
            onChange={(e) => setPaste(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPaste();
              }
            }}
            onBlur={() => {
              if (paste.trim()) addPaste();
            }}
          />
          <Button type="button" variant="outline" onClick={addPaste} className="shrink-0 shadow-sm">
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
