"use client";

import { useEffect, useRef } from "react";

/**
 * Lazy background video: nothing is fetched until the hero is near the
 * viewport, and playback only starts once it actually scrolls into view.
 * Pauses again when scrolled away to save bandwidth.
 */
export function HeroVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            /* autoplay may be blocked — image/gradient fallback stays visible */
          });
        } else {
          video.pause();
        }
      },
      { rootMargin: "250px 0px" },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      aria-hidden
      tabIndex={-1}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
