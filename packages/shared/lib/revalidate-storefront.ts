import { revalidatePath, revalidateTag } from "next/cache";

import { getAdminSecret } from "@/lib/admin";
import { isAdminCachePath } from "@/lib/revalidate-path-rules";
import { postStorefrontRevalidate } from "@/lib/revalidate-storefront-http";

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

/** POST shop `/api/revalidate` when `STOREFRONT_URL` is set; else local `revalidatePath`. */
export async function revalidateStorefront(
  targets: RevalidatePathInput[],
): Promise<{ ok: true } | { ok: false; status?: number; error: string }> {
  const paths = targets.map(normalize).filter((t) => t.path.length > 0);
  if (paths.length === 0) return { ok: true };

  const storefrontUrl = process.env.STOREFRONT_URL?.replace(/\/$/, "");
  if (!storefrontUrl) {
    for (const t of paths) revalidatePath(t.path, t.type);
    return { ok: true };
  }

  return postStorefrontRevalidate(storefrontUrl, getAdminSecret(), paths);
}

export async function revalidateAfterPublish(
  ...paths: string[]
): Promise<void> {
  const adminPaths = paths.filter(isAdminCachePath);
  const shopPaths = paths.filter((p) => !isAdminCachePath(p));
  for (const p of adminPaths) revalidatePath(p);
  if (shopPaths.length > 0) await revalidateStorefront(shopPaths);
}

export async function revalidateAfterPublishLayout(
  path: string,
): Promise<void> {
  if (isAdminCachePath(path)) {
    revalidatePath(path, "layout");
    return;
  }
  await revalidateStorefront([{ path, type: "layout" }]);
}

/** Bust `unstable_cache` entries tagged for admin-only data (settings, shop types, etc.). */
export function revalidateAdminCacheTag(tag: string): void {
  revalidateTag(tag);
}
