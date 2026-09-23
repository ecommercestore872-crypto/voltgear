type CategoryRef = { slug: string };

export function categoryIsAssignable(
  slug: string | undefined,
  types: CategoryRef[]
): { ok: true } | { ok: false; error: string } {
  const s = slug?.trim() ?? "";
  if (!s) return { ok: false, error: "Pick a category." };
  if (!types.some((t) => t.slug === s)) {
    return { ok: false, error: "Pick a category that exists in Shop types." };
  }
  return { ok: true };
}

export function extraCategoryPathsToRevalidate(previous: string, next: string): string[] {
  const paths = [`/products/${next}`];
  const old = previous.trim();
  if (old && old !== next) paths.push(`/products/${old}`);
  return paths;
}

export function canDeleteShopType(
  productCount: number
): { ok: true } | { ok: false; error: string } {
  if (productCount > 0) {
    const n = productCount;
    return {
      ok: false,
      error: `This shop type still has ${n} product${n === 1 ? "" : "s"}. Move them to another type, then you can delete it.`,
    };
  }
  return { ok: true };
}

export function canSaveShopType(input: {
  name?: string;
  slug?: string;
}): { ok: true } | { ok: false; error: string } {
  if (!input.name?.trim()) {
    return { ok: false, error: "Shop type name is required." };
  }
  if (!input.slug?.trim()) {
    return { ok: false, error: "Shop type name is required." };
  }
  return { ok: true };
}

export function shopTypeSlugTaken(
  slug: string,
  existing: { id: string; slug: string }[],
  currentId?: string
): boolean {
  const s = slug.trim();
  return existing.some((row) => row.slug === s && row.id !== currentId);
}
