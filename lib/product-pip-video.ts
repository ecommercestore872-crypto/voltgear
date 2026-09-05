import { CLOUDINARY_CLOUD_NAME } from "@/lib/cloudinary";
import { videoEmbedSrc, videoKind, type GadgetVideoKind } from "@/lib/gadget-preview";

export type ProductWatchLink = {
  platform: "instagram" | "tiktok";
  href: string;
};

export function productWatchLinks(product: {
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  productVideo?: { url?: string | null } | null;
}): ProductWatchLink[] {
  const links: ProductWatchLink[] = [];
  const instagram = product.instagramUrl?.trim();
  const tiktok = product.tiktokUrl?.trim();
  const videoUrl = product.productVideo?.url?.trim();
  const videoKindName = videoKind(videoUrl);

  if (instagram && videoKind(instagram) === "instagram") {
    links.push({ platform: "instagram", href: instagram });
  } else if (videoKindName === "instagram" && videoUrl) {
    links.push({ platform: "instagram", href: videoUrl });
  }

  if (tiktok && videoKind(tiktok) === "tiktok") {
    links.push({ platform: "tiktok", href: tiktok });
  } else if (videoKindName === "tiktok" && videoUrl) {
    links.push({ platform: "tiktok", href: videoUrl });
  }

  return links;
}

export type PipVideoKind = "file" | "instagram" | "tiktok";

export function pipDismissKey(slug: string) {
  return `bnt-video-pip:${slug}`;
}

export function isPipDismissed(slug: string, storage?: Pick<Storage, "getItem"> | null) {
  if (!slug) return false;
  try {
    const store = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
    return store?.getItem(pipDismissKey(slug)) === "1";
  } catch {
    return false;
  }
}

export function rememberPipDismissed(slug: string, storage?: Pick<Storage, "setItem"> | null) {
  if (!slug) return;
  try {
    const store = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
    store?.setItem(pipDismissKey(slug), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export type PipVideo = {
  kind: PipVideoKind;
  playSrc: string;
  openHref: string;
  openLabel: string;
  poster?: string;
};

type PipProduct = {
  productVideo?: {
    url?: string | null;
    cloudinaryPublicId?: string | null;
    poster?: string | { asset?: unknown } | null;
  } | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
};

function fileSrc(url?: string | null, cloudinaryPublicId?: string | null): string | null {
  if (cloudinaryPublicId?.trim() && CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${cloudinaryPublicId
      .trim()
      .replace(/^\/+/, "")}`;
  }
  if (url?.trim() && videoKind(url) === "file") return url.trim();
  return null;
}

export function videoOnlyPlaySrc(kind: GadgetVideoKind, url: string): string | null {
  if (kind === "tiktok") {
    try {
      const path = new URL(url).pathname;
      const match = path.match(/\/video\/(\d+)/);
      if (match) {
        return `https://www.tiktok.com/player/v1/${match[1]}?autoplay=1&loop=1&description=0&music_info=0`;
      }
    } catch {
      /* fall through */
    }
  }
  return videoEmbedSrc(kind, url);
}

function openMeta(
  kind: PipVideoKind,
  product: PipProduct,
  fallbackHref: string
): { openHref: string; openLabel: string } {
  const instagram = product.instagramUrl?.trim();
  const tiktok = product.tiktokUrl?.trim();
  if (kind === "instagram" || instagram) {
    return { openHref: instagram || fallbackHref, openLabel: "Open Instagram" };
  }
  if (kind === "tiktok" || tiktok) {
    return { openHref: tiktok || fallbackHref, openLabel: "Open TikTok" };
  }
  return { openHref: fallbackHref, openLabel: "Open video" };
}

function posterSrc(product: PipProduct): string | undefined {
  const poster = product.productVideo?.poster;
  return typeof poster === "string" && poster.trim() ? poster.trim() : undefined;
}

export function pipVideoForProduct(product: PipProduct): PipVideo | null {
  const file = fileSrc(product.productVideo?.url, product.productVideo?.cloudinaryPublicId);
  if (file) {
    const social = product.instagramUrl?.trim() || product.tiktokUrl?.trim() || file;
    const meta = openMeta("file", product, social);
    return {
      kind: "file",
      playSrc: file,
      poster: posterSrc(product),
      ...meta,
    };
  }

  const instagram = product.instagramUrl?.trim();
  if (instagram && videoKind(instagram) === "instagram") {
    const playSrc = videoOnlyPlaySrc("instagram", instagram);
    if (!playSrc) return null;
    return {
      kind: "instagram",
      playSrc,
      poster: posterSrc(product),
      ...openMeta("instagram", product, instagram),
    };
  }

  const videoUrl = product.productVideo?.url?.trim();
  const videoUrlKind = videoKind(videoUrl);
  if (videoUrl && (videoUrlKind === "instagram" || videoUrlKind === "tiktok")) {
    const playSrc = videoOnlyPlaySrc(videoUrlKind, videoUrl);
    if (!playSrc) return null;
    return {
      kind: videoUrlKind,
      playSrc,
      poster: posterSrc(product),
      ...openMeta(videoUrlKind, product, videoUrl),
    };
  }

  const tiktok = product.tiktokUrl?.trim();
  if (tiktok && videoKind(tiktok) === "tiktok") {
    const playSrc = videoOnlyPlaySrc("tiktok", tiktok);
    if (!playSrc) return null;
    return {
      kind: "tiktok",
      playSrc,
      poster: posterSrc(product),
      ...openMeta("tiktok", product, tiktok),
    };
  }

  return null;
}
