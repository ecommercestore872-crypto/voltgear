"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X } from "lucide-react";

import { InstagramIcon, TikTokIcon } from "@/components/icons/social-icons";
import {
  productWatchLinks,
  type ProductWatchLink,
} from "@/lib/product-pip-video";
import type { Product } from "@/lib/types";

export function GadgetProductWatchLinks({ product }: { product: Product }) {
  const links = productWatchLinks(product);
  const [active, setActive] = useState<ProductWatchLink | null>(null);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
      document.removeEventListener("keydown", onKey);
    };
  }, [active]);

  if (links.length === 0) return null;

  return (
    <div className="gadget-watch-block">
      <p className="gadget-watch-heading">Short preview</p>
      <ul className="gadget-watch-links" aria-label="Watch this product">
        {links.map((link) => (
          <li key={link.platform}>
            <button
              type="button"
              className={`gadget-watch-link is-${link.platform}`}
              aria-label={`Preview ${link.platform === "instagram" ? "Instagram" : "TikTok"} video`}
              onClick={() => setActive(link)}
            >
              {link.platform === "instagram" ? (
                <InstagramIcon className="h-4 w-4" />
              ) : (
                <TikTokIcon className="h-4 w-4" />
              )}
            </button>
          </li>
        ))}
      </ul>

      {mounted && active
        ? createPortal(
            <div
              className="gadget-watch-preview-root"
              role="presentation"
              onClick={() => setActive(null)}
            >
              <div
                className="gadget-watch-preview-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="gadget-watch-preview-bar">
                  <p id={titleId} className="gadget-watch-preview-title">
                    {product.name}
                  </p>
                  <button
                    type="button"
                    className="gadget-watch-preview-close"
                    aria-label="Close preview"
                    onClick={() => setActive(null)}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>

                <div
                  className={`gadget-watch-preview-stage is-${active.platform}`}
                >
                  <iframe
                    key={active.playSrc}
                    src={active.playSrc}
                    title={`${product.name} video preview`}
                    className="gadget-watch-preview-frame"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>

                <div className="gadget-watch-preview-actions">
                  <a
                    href={active.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gadget-watch-preview-open"
                  >
                    {active.openLabel}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
