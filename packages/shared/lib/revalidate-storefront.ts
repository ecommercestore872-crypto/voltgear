import { revalidatePath, revalidateTag } from "next/cache";

import { getAdminSecret } from "@/lib/admin";
import { isAdminCachePath } from "@/lib/revalidate-path-rules";
import { postStorefrontRevalidate } from "@/lib/revalidate-storefront-http";
import { STOREFRONT_MERCHANDISING_CACHE_TAGS } from "@/lib/storefront-cache";
import { logStorefrontRevalidate } from "@/lib/storefront-revalidate-log";

export type RevalidatePathInput =
  | string
  | { path: string; type?: "layout" | "page" };

function normalize(input: RevalidatePathInput): {
  path: string;
  type?: "layout" | "page";
} {
  return typeof input === "string" ? { path: input } : input;
}

export { isAdminCachePath } from "@/lib/revalidate-path-rules";

async function flushStorefrontCache(
  shopTargets: { path: string; type?: "layout" | "page" }[],
  tags: string[],
): Promise<{ ok: true } | { ok: false; status?: number; error: string }> {
  const paths = shopTargets.filter((t) => t.path.length > 0);
  const cleanTags = tags.map((t) => t.trim()).filter(Boolean);
  if (paths.length === 0 && cleanTags.length === 0) return { ok: true };

  const storefrontUrl = process.env.STOREFRONT_URL?.replace(/\/$/, "");
  if (!storefrontUrl) {
    for (const t of paths) revalidatePath(t.path, t.type);
    for (const tag of cleanTags) revalidateTag(tag);
    logStorefrontRevalidate({
      ok: true,
      paths: paths.map((p) => p.path),
      tags: cleanTags,
      local: true,
    });
    return { ok: true };
  }

  const result = await postStorefrontRevalidate(
    storefrontUrl,
    getAdminSecret(),
    paths,
    cleanTags,
  );
  logStorefrontRevalidate({
    ok: result.ok,
    paths: paths.map((p) => p.path),
    tags: cleanTags,
    status: result.ok ? undefined : result.status,
    error: result.ok ? undefined : result.error,
  });
  if (!result.ok && !process.env.STOREFRONT_URL?.includes("localhost")) {
    console.warn(
      "[storefront-revalidate] Set STOREFRONT_URL on admin and matching ADMIN_TOKEN on shop, or shoppers may see stale catalog for up to 5 minutes.",
    );
  }
  return result;
}

/** POST shop `/api/revalidate` when `STOREFRONT_URL` is set; else local `revalidatePath`. */
export async function revalidateStorefront(
  targets: RevalidatePathInput[],
): Promise<{ ok: true } | { ok: false; status?: number; error: string }> {
  const paths = targets.map(normalize).filter((t) => t.path.length > 0);
  return flushStorefrontCache(paths, []);
}

/** Bust storefront `unstable_cache` tags only. */
export async function revalidateStorefrontCacheTags(
  tags: string[],
): Promise<{ ok: true } | { ok: false; status?: number; error: string }> {
  return flushStorefrontCache([], tags);
}

/** @deprecated Prefer `revalidateShopMerchandising` — keeps tags in sync with paths. */
export const STOREFRONT_CATALOG_CACHE_TAGS = [...STOREFRONT_MERCHANDISING_CACHE_TAGS] as const;

export async function revalidateStorefrontCatalogCaches(): Promise<void> {
  await revalidateShopMerchandising();
}

/**
 * After admin merchandising writes: revalidate shop paths + all catalog/home data cache tags in one POST.
 */
export async function revalidateShopMerchandising(
  ...inputs: RevalidatePathInput[]
): Promise<void> {
  const normalized = inputs.map(normalize).filter((t) => t.path.length > 0);
  const adminTargets = normalized.filter((t) => isAdminCachePath(t.path));
  const shopTargets = normalized.filter((t) => !isAdminCachePath(t.path));

  for (const t of adminTargets) revalidatePath(t.path, t.type);

  await flushStorefrontCache(shopTargets, [...STOREFRONT_MERCHANDISING_CACHE_TAGS]);
}

/** Home layout / settings draft — layout ISR + merchandising data caches. */
export async function revalidateShopMerchandisingLayout(
  path: string,
): Promise<void> {
  if (isAdminCachePath(path)) {
    revalidatePath(path, "layout");
    return;
  }
  await flushStorefrontCache([{ path, type: "layout" }], [
    ...STOREFRONT_MERCHANDISING_CACHE_TAGS,
  ]);
}

export async function revalidateAfterPublish(
  ...paths: string[]
): Promise<void> {
  const adminPaths = paths.filter(isAdminCachePath);
  const shopPaths = paths.filter((p) => !isAdminCachePath(p));
  for (const p of adminPaths) revalidatePath(p);
  if (shopPaths.length > 0) await flushStorefrontCache(shopPaths.map((p) => ({ path: p })), []);
}

export async function revalidateAfterPublishLayout(
  path: string,
): Promise<void> {
  if (isAdminCachePath(path)) {
    revalidatePath(path, "layout");
    return;
  }
  await flushStorefrontCache([{ path, type: "layout" }], []);
}

/** Bust `unstable_cache` entries tagged for admin-only data (settings, shop types, etc.). */
export function revalidateAdminCacheTag(tag: string): void {
  revalidateTag(tag);
}
