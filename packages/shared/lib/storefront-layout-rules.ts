import { isGadgetPreviewPath } from "@/lib/gadget-preview";

export type ChromeMode = "admin" | "gadget" | "shop";

import { isAdminPublicPath } from "@/lib/admin-public-paths";

export function isAdminLoginPath(pathname: string): boolean {
  return isAdminPublicPath(pathname);
}

export function needsStorefrontChrome(pathname: string): boolean {
  return !pathname.startsWith("/admin");
}

export function chromeMode(pathname: string): ChromeMode {
  if (pathname.startsWith("/admin")) return "admin";
  if (isGadgetPreviewPath(pathname)) return "gadget";
  return "shop";
}

export function pathnameFromHeaders(headers: Record<string, string | null | undefined>): string {
  const explicit = (headers["x-pathname"] ?? "").trim();
  if (explicit.startsWith("/")) return explicit.split("?")[0] || "/";

  const nextUrl = (headers["next-url"] ?? "").trim();
  if (!nextUrl) return "";
  try {
    if (nextUrl.startsWith("/")) return nextUrl.split("?")[0] || "/";
    return new URL(nextUrl).pathname || "";
  } catch {
    return "";
  }
}
