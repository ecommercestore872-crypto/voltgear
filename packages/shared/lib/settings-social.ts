/** DB/draft may store social links as an array or a legacy object — never call .find on non-arrays. */
export function normalizeSettingsSocialLinks(
  raw: unknown,
): { platform?: string; url?: string }[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((row) => row && typeof row === "object") as {
      platform?: string;
      url?: string;
    }[];
  }
  if (typeof raw === "object") {
    const rec = raw as Record<string, unknown>;
    const platforms = ["instagram", "tiktok", "facebook"] as const;
    return platforms
      .map((platform) => {
        const url = rec[platform];
        return typeof url === "string" && url.trim()
          ? { platform, url: url.trim() }
          : null;
      })
      .filter(Boolean) as { platform?: string; url?: string }[];
  }
  return [];
}