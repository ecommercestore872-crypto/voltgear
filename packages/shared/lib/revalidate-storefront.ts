import { revalidatePath } from "next/cache";

import { getAdminSecret } from "@/lib/admin";

export type RevalidatePathInput =
  | string
  | { path: string; type?: "layout" | "page" };

function normalize(input: RevalidatePathInput): {
  path: string;
  type?: "layout" | "page";
} {
  return typeof input === "string" ? { path: input } : input;
}

export function isAdminCachePath(path: string): boolean {
  return path.startsWith("/admin");
}

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

  const token = getAdminSecret();
  let res: Response;
  try {
    res = await fetch(`${storefrontUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paths }),
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Revalidate request failed",
    };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      error: body || res.statusText || "Revalidate failed",
    };
  }

  return { ok: true };
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
