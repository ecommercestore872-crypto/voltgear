import { adminHeaders } from "@/lib/admin-token";

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
  if (res.status === 401) throw new AdminAuthError();
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Request failed");
  return json;
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
