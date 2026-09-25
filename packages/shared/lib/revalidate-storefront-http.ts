export type RevalidatePathEntry = {
  path: string;
  type?: "layout" | "page";
};

export type RevalidateHttpResult =
  | { ok: true }
  | { ok: false; status?: number; error: string };

/** POST shop `/api/revalidate` (no Next.js cache dependency — safe for unit tests). */
export async function postStorefrontRevalidate(
  storefrontUrl: string,
  bearerToken: string,
  paths: RevalidatePathEntry[],
  fetchFn: typeof fetch = fetch,
): Promise<RevalidateHttpResult> {
  const base = storefrontUrl.replace(/\/$/, "");
  if (paths.length === 0) return { ok: true };

  let res: Response;
  try {
    res = await fetchFn(`${base}/api/revalidate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
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
