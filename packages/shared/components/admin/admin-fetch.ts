import { adminHeaders, clearAdminToken } from "@/lib/admin-token";
import { validateAdminUploadMetadata } from "@/lib/admin-upload-rules";
import { AdminRequestError } from "@/lib/admin-request-error";
export { AdminRequestError } from "@/lib/admin-request-error";

export class AdminAuthError extends Error {}

export async function adminFetch(url: string, options: RequestInit = {}) {
  const isForm =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const mutating = !["GET", "HEAD"].includes((options.method ?? "GET").toUpperCase());
  let res: Response;
  try { res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...adminHeaders(),
      ...(options.body && !isForm
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  }); } catch {
    throw new AdminRequestError(mutating ? "The request outcome is uncertain. Reload before retrying." : "Request failed. Please try again.", undefined, mutating);
  }
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      clearAdminToken();
      window.location.assign("/admin/login");
    }
    throw new AdminAuthError();
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new AdminRequestError(json?.error ?? "Request failed", res.status, mutating && (res.status === 408 || res.status >= 500));
  return json;
}

/** Same auth as adminFetch, for binary responses (downloads). */
export async function adminFetchBlob(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...adminHeaders(),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      clearAdminToken();
      window.location.assign("/admin/login");
    }
    throw new AdminAuthError();
  }
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error ?? "Request failed");
  }
  return res;
}

export async function adminUpload(
  file: File,
  folder = "ecommerce-store/admin",
) {
  // Fast feedback only: the server repeats these checks and validates actual bytes.
  validateAdminUploadMetadata(file);
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    return await adminFetch("/api/admin/upload", { method: "POST", body: form, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Upload timed out. Its outcome may be uncertain; check the media provider before retrying.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
