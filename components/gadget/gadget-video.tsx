"use client";

import { useState } from "react";

import { CLOUDINARY_CLOUD_NAME } from "@/lib/cloudinary";
import { hasShopperProductVideo, videoEmbedSrc, videoKind } from "@/lib/gadget-preview";
import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type PlayableKind = "file" | "instagram" | "tiktok";

type VideoSource = {
  key: string;
  label: string;
  kind: PlayableKind;
  src: string;
};

function fileSrc(url?: string | null, cloudinaryPublicId?: string | null): string | null {
  if (cloudinaryPublicId?.trim() && CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${cloudinaryPublicId
      .trim()
      .replace(/^\/+/, "")}`;
  }
  if (url?.trim() && /^https?:\/\//i.test(url.trim())) return url.trim();
  return null;
}

function collectSources(product: Product): VideoSource[] {
  const seen = new Set<string>();
  const sources: VideoSource[] = [];

  function add(
    key: string,
    label: string,
    url?: string | null,
    cloudinaryPublicId?: string | null
  ) {
    const kind = videoKind(url, cloudinaryPublicId);
    if (kind === "none") return;
    const fingerprint = (url?.trim() || cloudinaryPublicId?.trim() || "").toLowerCase();
    if (fingerprint && seen.has(fingerprint)) return;
    if (fingerprint) seen.add(fingerprint);

    if (kind === "file") {
      const src = fileSrc(url, cloudinaryPublicId);
      if (!src) return;
      sources.push({ key, label, kind, src });
      return;
    }

    const embed = videoEmbedSrc(kind, url ?? "");
    if (!embed) return;
    sources.push({ key, label, kind, src: embed });
  }

  add("demo", "Product video", product.productVideo?.url, product.productVideo?.cloudinaryPublicId);
  add("instagram", "Instagram", product.instagramUrl);
  add("tiktok", "TikTok", product.tiktokUrl);
  return sources;
}

function posterSrc(product: Product): string | undefined {
  const poster = product.productVideo?.poster;
  if (!poster) return undefined;
  if (typeof poster === "string") return poster;
  return imageUrl(poster, { w: 1200 });
}

export { hasShopperProductVideo };

export function GadgetVideoPlayer({ product }: { product: Product }) {
  const sources = collectSources(product);
  const [activeKey, setActiveKey] = useState(sources[0]?.key ?? "");
  const active = sources.find((s) => s.key === activeKey) ?? sources[0];

  if (!active) return null;

  const social = active.kind === "instagram" || active.kind === "tiktok";

  return (
    <div>
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-[var(--g-line)] bg-[var(--g-cream-deep)]",
          social && "flex justify-center"
        )}
      >
        {active.kind === "file" ? (
          <video
            key={active.src}
            controls
            preload="metadata"
            playsInline
            poster={posterSrc(product)}
            className="aspect-video w-full bg-[var(--g-charcoal)]/5"
          >
            <source src={active.src} />
            Your browser does not support the video tag.
          </video>
        ) : (
          <iframe
            key={active.src}
            title={`${product.name} video`}
            src={active.src}
            className="aspect-[9/16] w-full max-h-[32rem] max-w-[22rem] sm:max-w-[24rem]"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>

      {sources.length > 1 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {sources.map((source) => {
            const selected = source.key === active.key;
            return (
              <li key={source.key}>
                <button
                  type="button"
                  onClick={() => setActiveKey(source.key)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    selected
                      ? "border-[var(--g-forest)] bg-[var(--g-forest)] text-[var(--g-cream)]"
                      : "border-[var(--g-forest)]/20 bg-[var(--g-cream-deep)] text-[var(--g-forest)] hover:border-[var(--g-forest)]"
                  )}
                >
                  {source.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function GadgetVideo({ product }: { product: Product }) {
  if (!hasShopperProductVideo(product)) return null;

  return (
    <section className="mt-12" aria-labelledby="gadget-video">
      <h2 id="gadget-video" className="text-xl font-black uppercase tracking-tight">
        See it
      </h2>
      <div className="mt-4">
        <GadgetVideoPlayer product={product} />
      </div>
    </section>
  );
}
