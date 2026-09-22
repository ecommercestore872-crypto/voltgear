import { adminHeaders, clearAdminToken } from "@/lib/admin-token";

export class AdminAuthError extends Error {}

export async function adminFetch(url: string, options: RequestInit = {}) {
  const isForm =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...adminHeaders(),
      ...(options.body && !isForm
        ? { "Content-Type": "application/json" }
        : {}),
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
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Request failed");
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
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  return adminFetch("/api/admin/upload", { method: "POST", body: form });
}
