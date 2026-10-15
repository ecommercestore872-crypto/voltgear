/** A configured category is public only while it remains active in the CMS. */
export function categoryIsStorefrontVisible(
  category: string | undefined,
  active: ReadonlySet<string> | null,
): boolean {
  return !category || !active || active.has(category);
}
