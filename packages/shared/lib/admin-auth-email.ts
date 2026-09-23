import { publicSiteUrl } from "@/lib/deploy-rules";

const DEFAULT_ADMIN_AUTH_EMAILS = ["alyabbas101@gmail.com"];

export function normalizeAdminEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function adminAuthEmailAllowlist(env: Record<string, string | undefined> = process.env): string[] {
  const raw = env.ADMIN_AUTH_EMAILS?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((part) => normalizeAdminEmail(part))
      .filter(Boolean);
  }
  return [...DEFAULT_ADMIN_AUTH_EMAILS];
}

export function isAllowedAdminAuthEmail(
  email: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const normalized = normalizeAdminEmail(email);
  if (!normalized) return false;
  return adminAuthEmailAllowlist(env).includes(normalized);
}

export function adminPasswordResetRedirectUrl(env: Record<string, string | undefined> = process.env): string {
  const base = publicSiteUrl(env).replace(/\/+$/, "");
  return `${base}/admin/reset-password`;
}