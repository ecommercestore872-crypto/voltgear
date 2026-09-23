import type { PublicSiteConfig } from "@/lib/site-config";

export const BRAND_SOCIAL_DEFAULTS = {
  instagram: "https://www.instagram.com/buyntry_/",
  tiktok: "https://www.tiktok.com/@buyntryy_",
  facebook: "https://www.facebook.com/buyntryy",
} as const;

export type SocialPlatformId = "instagram" | "tiktok" | "facebook";

export type PublicSocialLink = {
  id: SocialPlatformId;
  href: string;
  label: string;
  handle: string;
};

function cleanUrl(url: string | null | undefined): string | null {
  const trimmed = (url ?? "").trim();
  if (!trimmed.startsWith("http")) return null;
  return trimmed;
}

export function resolveSocialUrl(
  platform: SocialPlatformId,
  configured: string | null,
): string | null {
  return (
    cleanUrl(configured) ??
    cleanUrl(BRAND_SOCIAL_DEFAULTS[platform]) ??
    null
  );
}

export function getPublicSocialLinks(
  config: Pick<
    PublicSiteConfig,
    "instagramUrl" | "tiktokUrl" | "facebookUrl"
  >,
): PublicSocialLink[] {
  const entries: {
    id: SocialPlatformId;
    url: string | null;
    label: string;
    handle: string;
  }[] = [
    {
      id: "instagram",
      url: resolveSocialUrl("instagram", config.instagramUrl),
      label: "Instagram",
      handle: "@buyntry_",
    },
    {
      id: "tiktok",
      url: resolveSocialUrl("tiktok", config.tiktokUrl),
      label: "TikTok",
      handle: "@buyntryy_",
    },
    {
      id: "facebook",
      url: resolveSocialUrl("facebook", config.facebookUrl),
      label: "Facebook",
      handle: "Buy n Try",
    },
  ];
  return entries
    .filter((e): e is typeof e & { url: string } => Boolean(e.url))
    .map(({ id, url, label, handle }) => ({ id, href: url, label, handle }));
}