export type VariantOption = {
  key: string;
  name: string;
  enabled: boolean;
  image?: string;
};

export type VariantAxes = {
  colorEnabled?: boolean;
  sizeEnabled?: boolean;
  colorOptions?: VariantOption[];
  sizeOptions?: VariantOption[];
};

export type GeneratedVariant = {
  _key: string;
  name: string;
  stockStatus: string;
  image?: string;
  isDefault?: boolean;
};

export function optionKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function axesEnabled(axes: VariantAxes): boolean {
  return Boolean(axes.colorEnabled || axes.sizeEnabled);
}

export function parseVariantOptions(raw: unknown): VariantOption[] {
  if (!Array.isArray(raw)) return [];
  const out: VariantOption[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const key =
      typeof rec.key === "string" && rec.key.trim()
        ? optionKey(rec.key)
        : optionKey(name);
    if (!name || !key) continue;
    const image = typeof rec.image === "string" && rec.image.trim() ? rec.image.trim() : undefined;
    out.push({
      key,
      name,
      enabled: rec.enabled !== false,
      ...(image ? { image } : {}),
    });
  }
  return out;
}

export function enabledOptions(options: VariantOption[] | undefined): VariantOption[] {
  return (options ?? []).filter((o) => o.enabled && optionKey(o.name));
}

export function validateVariantAxes(
  axes: VariantAxes
): { ok: true } | { ok: false; error: string } {
  if (axes.colorEnabled) {
    const colors = enabledOptions(axes.colorOptions);
    if (!colors.length) {
      return { ok: false, error: "Add at least one color, or turn Color off." };
    }
    const names = colors.map((c) => c.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      return { ok: false, error: "Color names must be unique." };
    }
    const keys = colors.map((c) => c.key || optionKey(c.name));
    if (new Set(keys).size !== keys.length) {
      return { ok: false, error: "Color names must be unique." };
    }
  }
  if (axes.sizeEnabled) {
    const sizes = enabledOptions(axes.sizeOptions);
    if (!sizes.length) {
      return { ok: false, error: "Add at least one size, or turn Size off." };
    }
    const names = sizes.map((s) => s.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      return { ok: false, error: "Size names must be unique." };
    }
    const keys = sizes.map((s) => s.key || optionKey(s.name));
    if (new Set(keys).size !== keys.length) {
      return { ok: false, error: "Size names must be unique." };
    }
  }
  return { ok: true };
}

export function comboVariantKey(colorKey?: string | null, sizeKey?: string | null): string | null {
  const color = colorKey?.trim() || "";
  const size = sizeKey?.trim() || "";
  if (color && size) return `${color}__${size}`;
  if (color) return color;
  if (size) return size;
  return null;
}

export function canSubmitVariantSelection(
  axes: VariantAxes,
  colorKey?: string | null,
  sizeKey?: string | null
): boolean {
  if (!axesEnabled(axes)) return true;
  if (axes.colorEnabled && !colorKey) return false;
  if (axes.sizeEnabled && !sizeKey) return false;
  if (axes.colorEnabled && !enabledOptions(axes.colorOptions).some((c) => c.key === colorKey)) {
    return false;
  }
  if (axes.sizeEnabled && !enabledOptions(axes.sizeOptions).some((s) => s.key === sizeKey)) {
    return false;
  }
  return true;
}

export function initialAxisSelection(options: VariantOption[] | undefined): string | null {
  const live = enabledOptions(options);
  return live.length === 1 ? live[0].key : null;
}

export function colorImageForKey(
  options: VariantOption[] | undefined,
  colorKey?: string | null
): string | undefined {
  if (!colorKey) return undefined;
  return enabledOptions(options).find((c) => c.key === colorKey)?.image;
}

export function generateSellableVariants(
  axes: VariantAxes,
  stockStatus = "in-stock"
): GeneratedVariant[] {
  if (!axesEnabled(axes)) return [];
  const colors = axes.colorEnabled ? enabledOptions(axes.colorOptions) : [];
  const sizes = axes.sizeEnabled ? enabledOptions(axes.sizeOptions) : [];
  const rows: GeneratedVariant[] = [];

  if (axes.colorEnabled && axes.sizeEnabled) {
    for (const color of colors) {
      for (const size of sizes) {
        rows.push({
          _key: `${color.key}__${size.key}`,
          name: `${color.name} / ${size.name}`,
          stockStatus,
          ...(color.image ? { image: color.image } : {}),
        });
      }
    }
  } else if (axes.colorEnabled) {
    for (const color of colors) {
      rows.push({
        _key: color.key,
        name: color.name,
        stockStatus,
        ...(color.image ? { image: color.image } : {}),
      });
    }
  } else {
    for (const size of sizes) {
      rows.push({
        _key: size.key,
        name: size.name,
        stockStatus,
      });
    }
  }

  if (rows.length === 1) rows[0].isDefault = true;
  return rows;
}
