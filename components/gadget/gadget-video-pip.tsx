"use client";

import { useEffect, useRef, useState } from "react";

import { pipVideoForProduct } from "@/lib/product-pip-video";
import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";

function posterFor(product: Product): string | undefined {
  const pip = pipVideoForProduct(product);
  if (pip?.poster) return pip.poster;
  const raw = product.productVideo?.poster;
  if (raw && typeof raw !== "string") return imageUrl(raw, { w: 480 });
  const first = product.images?.[0];
  return first ? imageUrl(first, { w: 480 }) : undefined;
}

export function GadgetVideoPip({ product }: { product: Product }) {
  const pip = pipVideoForProduct(product);
  const poster = posterFor(product);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open || pip?.kind !== "file") return;
    const node = fileRef.current;
    if (!node) return;
    node.muted = true;
    const play = node.play();
    if (play) play.catch(() => undefined);
  }, [open, pip?.kind, pip?.playSrc]);

  if (!pip) return null;

  return (
    <section className="gadget-video-section" aria-label={`${product.name} video`}>
      {!open ? (
        <button
          type="button"
          className="gadget-video-thumb"
          onClick={() => setOpen(true)}
          aria-label="Open short video preview"
        >
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="gadget-video-pip-media" />
          ) : (
            <span className="gadget-video-pip-fallback" />
          )}
          <span className="gadget-video-thumb-label">Video</span>
        </button>
      ) : (
        <div className="gadget-video-open" role="dialog" aria-label={`${product.name} video preview`}>
          <div className="gadget-video-preview">
            {pip.kind === "file" ? (
              <video
                ref={fileRef}
                className="gadget-video-pip-media"
                src={pip.playSrc}
                poster={poster}
                autoPlay
                playsInline
                muted
                loop
                controls
                preload="auto"
              />
            ) : (
              <iframe
                title={`${product.name} video`}
                src={pip.playSrc}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                className={`gadget-video-frame is-${pip.kind}`}
              />
            )}
          </div>
          <div className="gadget-video-inline-actions">
            <button type="button" className="gadget-video-pip-dismiss" onClick={() => setOpen(false)}>
              Close
            </button>
            <a
              href={pip.openHref}
              target="_blank"
              rel="noopener noreferrer"
              className="gadget-video-pip-open"
            >
              {pip.openLabel}
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
