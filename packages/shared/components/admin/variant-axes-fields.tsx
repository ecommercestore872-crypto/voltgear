"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminUpload } from "@/components/admin/admin-fetch";
import { isAdminUploadUrl } from "@/lib/admin-upload-rules";
import { optionKey, type VariantOption } from "@/lib/variant-options-rules";

function blankOption(): VariantOption {
  return {
    key: `opt-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    enabled: true,
  };
}

function ColorPhotoInput({
  url,
  onChange,
  onBusyChange,
  disabled = false,
}: {
  url?: string;
  onChange: (url?: string) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef({ onChange, onBusyChange, disabled });
  current.current = { onChange, onBusyChange, disabled };
  const mounted = useRef(true);
  const pending = useRef(false);
  const release = useCallback(() => {
    if (pending.current) {
      pending.current = false;
      current.current.onBusyChange?.(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; release(); };
  }, [release]);

  async function onFile(file?: File) {
    if (!file || pending.current || current.current.disabled) return;
    pending.current = true;
    setBusy(true);
    current.current.onBusyChange?.(true);
    setError(null);
    try {
      const json = await adminUpload(file);
      if (!mounted.current) return;
      const image = typeof json?.secureUrl === "string" ? json.secureUrl.trim() : "";
      if (!isAdminUploadUrl(image)) throw new Error("Upload returned an invalid image URL.");
      current.current.onChange(image);
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      release();
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Photo (optional)</Label>
      <div className="flex items-center gap-2">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-10 w-10 rounded object-cover" />
        ) : null}
        <Input
          type="file"
          accept="image/*"
          disabled={busy || disabled}
          className="h-10 text-xs"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {url ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
              disabled={busy || disabled}
            onClick={() => onChange(undefined)}
          >
            Clear
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function OptionList({
  options,
  onChange,
  withPhoto,
  addLabel,
  onBusyChange,
  disabled,
}: {
  options: VariantOption[];
  onChange: (next: VariantOption[]) => void;
  withPhoto?: boolean;
  addLabel: string;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  function patch(index: number, next: Partial<VariantOption>) {
    onChange(
      options.map((row, i) => {
        if (i !== index) return row;
        const merged = { ...row, ...next };
        if (next.name != null) {
          const key = optionKey(next.name);
          if (key) merged.key = key;
        }
        return merged;
      }),
    );
  }

  return (
    <div className="space-y-3">
      {options.map((row, i) => (
        <div
          key={`${row.key}-${i}`}
          className="space-y-2 rounded-md border p-3"
        >
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[8rem] flex-1 space-y-1">
              <Label htmlFor={`opt-name-${row.key}-${i}`}>Name</Label>
              <Input
                id={`opt-name-${row.key}-${i}`}
                value={row.name}
                onChange={(e) => patch(i, { name: e.target.value })}
              />
            </div>
            <label className="flex h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => patch(i, { enabled: e.target.checked })}
              />
              On
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove"
              onClick={() => onChange(options.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {withPhoto ? (
            <ColorPhotoInput
              url={row.image}
              onBusyChange={onBusyChange}
              disabled={disabled}
              onChange={(image) => patch(i, { image })}
            />
          ) : null}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...options, blankOption()])}
      >
        <Plus className="mr-1 h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}

export function VariantAxesFields({
  colorEnabled,
  sizeEnabled,
  colorOptions,
  sizeOptions,
  onChange,
  onBusyChange,
  disabled = false,
}: {
  colorEnabled: boolean;
  sizeEnabled: boolean;
  colorOptions: VariantOption[];
  sizeOptions: VariantOption[];
  onChange: (next: {
    colorEnabled: boolean;
    sizeEnabled: boolean;
    colorOptions: VariantOption[];
    sizeOptions: VariantOption[];
  }) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-4">
      <div>
        <p className="text-sm font-medium">Variants</p>
        <p className="text-xs text-muted-foreground">
          Turn Color and Size on as needed. Off values stay hidden. Units stay
          on the product.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={colorEnabled}
          onChange={(e) =>
            onChange({
              colorEnabled: e.target.checked,
              sizeEnabled,
              colorOptions,
              sizeOptions,
            })
          }
        />
        Color variants
      </label>
      {colorEnabled ? (
        <OptionList
          options={colorOptions}
          onBusyChange={onBusyChange}
          disabled={disabled}
          withPhoto
          addLabel="Add color"
          onChange={(next) =>
            onChange({
              colorEnabled,
              sizeEnabled,
              colorOptions: next,
              sizeOptions,
            })
          }
        />
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sizeEnabled}
          onChange={(e) =>
            onChange({
              colorEnabled,
              sizeEnabled: e.target.checked,
              colorOptions,
              sizeOptions,
            })
          }
        />
        Size variants
      </label>
      {sizeEnabled ? (
        <OptionList
          options={sizeOptions}
          addLabel="Add size"
          onChange={(next) =>
            onChange({
              colorEnabled,
              sizeEnabled,
              colorOptions,
              sizeOptions: next,
            })
          }
        />
      ) : null}
    </fieldset>
  );
}
