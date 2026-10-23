"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { adminUpload } from "./admin-fetch";
import { isProductImageTooSmall } from "@/lib/product-image";

function mediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url || /[\\\u0000-\u0020\u007f]/.test(url)) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? url : null;
  } catch {
    return null;
  }
}

export function MediaField({
  label,
  urls,
  onChange,
  onBusyChange,
  accept = "image/*,.heic,.heif",
  hint,
  disabled = false,
}: {
  label: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  onBusyChange?: (busy: boolean) => void;
  accept?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const pendingRef = useRef<{ release: () => void } | null>(null);
  const latestRef = useRef({ urls, onChange, onBusyChange, disabled });
  latestRef.current = { urls, onChange, onBusyChange, disabled };
  const pasteRef = useRef("");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pendingRef.current?.release();
    };
  }, []);

  function changeUrls(next: string[]) {
    latestRef.current.urls = next;
    latestRef.current.onChange(next);
  }

  async function onFile(file?: File) {
    if (!file || !mountedRef.current || latestRef.current.disabled || pendingRef.current) return;
    // Pair the release with the observer that received the acquire, even if props change.
    const notifyBusy = latestRef.current.onBusyChange;
    let released = false;
    const pending = { release() {
      if (released) return;
      released = true;
      notifyBusy?.(false);
    } };
    pendingRef.current = pending;
    setBusy(true);
    notifyBusy?.(true);
    setError(null);
    setWarn(null);
    try {
      const json = await adminUpload(file);
      if (!mountedRef.current) return;
      const uploadedUrl = mediaUrl(json?.secureUrl);
      if (!uploadedUrl) throw new Error("Upload did not return a valid media URL. Please try again.");
      changeUrls([...latestRef.current.urls, uploadedUrl]);
      if (
        accept.startsWith("image") &&
        isProductImageTooSmall(json.width, json.height)
      ) {
        setWarn(
          "This photo is smaller than 800 × 800. It may look blurry. Use a square 2048 × 2048 photo for a sharp result.",
        );
      }
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      pending.release();
      if (pendingRef.current === pending) pendingRef.current = null;
      if (mountedRef.current) {
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  }

  function addPaste() {
    if (!mountedRef.current || latestRef.current.disabled || !pasteRef.current.trim()) return;
    const url = mediaUrl(pasteRef.current);
    if (!url) {
      setError("Use an HTTPS media URL or a local path beginning with /.");
      return;
    }
    changeUrls([...latestRef.current.urls, url]);
    pasteRef.current = "";
    setPaste("");
    setError(null);
  }

  function move(index: number, dir: -1 | 1) {
    if (!mountedRef.current || latestRef.current.disabled) return;
    const next = [...latestRef.current.urls];
    const target = index + dir;
    if (index < 0 || index >= next.length || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    changeUrls(next);
  }

  function handleRemove(index: number) {
    if (!mountedRef.current || latestRef.current.disabled) return;
    // This edits the form relationship only. Assets may still be live or shared.
    changeUrls(latestRef.current.urls.filter((_, j) => j !== index));
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
                className="h-14 w-14 shrink-0 rounded-lg border border-border bg-[#fffdf8] object-contain object-center p-1"
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
              disabled={disabled || i === 0}
              onClick={() => move(i, -1)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Move down"
              disabled={disabled || i === urls.length - 1}
              onClick={() => move(i, 1)}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove"
              disabled={disabled}
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
            disabled={busy || disabled}
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
            disabled={busy || disabled}
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">or paste link:</span>
        </div>
        <div className="flex flex-1 gap-2 w-full min-w-0">
          <Input
            placeholder="https://..."
            value={paste}
            disabled={disabled}
            className="min-w-0 shadow-sm"
            onChange={(e) => {
              pasteRef.current = e.target.value;
              setPaste(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPaste();
              }
            }}
            onBlur={() => {
              addPaste();
            }}
          />
          <Button type="button" variant="outline" disabled={disabled} onClick={addPaste} className="shrink-0 shadow-sm">
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
      {warn ? <p className="text-sm text-amber-700">{warn}</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
