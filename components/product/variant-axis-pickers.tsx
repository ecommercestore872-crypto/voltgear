"use client";

import { enabledOptions, type VariantOption } from "@/lib/variant-options-rules";
import { imageUrl } from "@/lib/sanity/image";
import { cn } from "@/lib/utils";

function AxisButtons({
  legend,
  options,
  value,
  onChange,
  swatches,
}: {
  legend: string;
  options: VariantOption[];
  value: string | null;
  onChange: (key: string) => void;
  swatches?: boolean;
}) {
  const live = enabledOptions(options);
  if (!live.length) return null;
  return (
    <fieldset className="mt-6">
      <legend className="mb-2 text-sm font-semibold text-[var(--g-charcoal)]">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {live.map((opt) => {
          const selected = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt.key)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                selected
                  ? "border-[var(--g-forest)] bg-[var(--g-forest)] text-[var(--g-white)]"
                  : "border-[var(--g-line)] bg-[var(--g-white)] text-[var(--g-charcoal)] hover:border-[var(--g-forest)]"
              )}
            >
              {swatches && opt.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl(opt.image, { w: 64 })}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : null}
              {opt.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function VariantAxisPickers({
  colorEnabled,
  sizeEnabled,
  colorOptions,
  sizeOptions,
  colorKey,
  sizeKey,
  onColorKey,
  onSizeKey,
}: {
  colorEnabled?: boolean;
  sizeEnabled?: boolean;
  colorOptions?: VariantOption[];
  sizeOptions?: VariantOption[];
  colorKey: string | null;
  sizeKey: string | null;
  onColorKey: (key: string) => void;
  onSizeKey: (key: string) => void;
}) {
  return (
    <>
      {colorEnabled ? (
        <AxisButtons
          legend="Color"
          options={colorOptions ?? []}
          value={colorKey}
          onChange={onColorKey}
          swatches
        />
      ) : null}
      {sizeEnabled ? (
        <AxisButtons
          legend="Size"
          options={sizeOptions ?? []}
          value={sizeKey}
          onChange={onSizeKey}
        />
      ) : null}
    </>
  );
}
