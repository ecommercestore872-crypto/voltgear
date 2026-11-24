"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Play, Volume2, VolumeX } from "lucide-react";

/**
 * Inline product video for the PDP gallery.
 * - Only mounted when its slide is selected, so it never competes with the first image (LCP).
 * - preload="none" until the slide is near the viewport; autoplays (muted) only while visible.
 * - No autoplay for prefers-reduced-motion or Save-Data; the viewer taps play instead.
 */
export function ProductGalleryVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster?: string;
  label: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const autoPausing = useRef(false);

  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [autoplayAllowed, setAutoplayAllowed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    );
    setAutoplayAllowed(!reduce && !saveData);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      setVisible(true);
      return;
    }
    const nearObserver = new IntersectionObserver(
      ([entry]) => entry && setNear(entry.isIntersecting),
      { rootMargin: "300px" },
    );
    const visibleObserver = new IntersectionObserver(
      ([entry]) => entry && setVisible(entry.isIntersecting),
      { threshold: 0.5 },
    );
    nearObserver.observe(el);
    visibleObserver.observe(el);
    return () => {
      nearObserver.disconnect();
      visibleObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (visible && autoplayAllowed && !userPaused.current) {
      void video.play().catch(() => undefined);
    } else if (!visible && !video.paused) {
      autoPausing.current = true;
      video.pause();
    }
  }, [visible, autoplayAllowed]);

  function play() {
    userPaused.current = false;
    void videoRef.current?.play().catch(() => undefined);
  }

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 1;
  }

  return (
    <div ref={wrapRef} className="absolute inset-0 bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        src={src}
        poster={poster}
        aria-label={label}
        muted
        loop
        playsInline
        controls
        controlsList="nodownload"
        preload={near ? "metadata" : "none"}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          if (autoPausing.current) autoPausing.current = false;
          else userPaused.current = true;
        }}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
      />
      {!playing && (
        <button
          type="button"
          onClick={play}
          aria-label="Play product video"
          className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-md transition-colors hover:bg-black/75"
        >
          <Play className="h-6 w-6 fill-white" />
        </button>
      )}
      <button
        type="button"
        onClick={toggleSound}
        aria-label={muted ? "Turn sound on" : "Turn sound off"}
        aria-pressed={!muted}
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white shadow-md transition-colors hover:bg-black/75"
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
    </div>
  );
}

/**
 * Instagram / TikTok video for the gallery. The third-party embed (scripts, cookies, weight)
 * loads only after the shopper taps play, so the page stays fast.
 */
export function ProductGalleryEmbed({
  src,
  poster,
  label,
  platform,
  openHref,
}: {
  src: string;
  poster?: string;
  label: string;
  platform: "instagram" | "tiktok";
  openHref?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const name = platform === "instagram" ? "Instagram" : "TikTok";
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {loaded ? (
        <iframe
          src={src}
          title={label}
          className={
            platform === "instagram"
              ? "absolute inset-x-0 -top-[60px] h-[calc(100%+180px)] w-full border-0"
              : "absolute inset-0 h-full w-full border-0"
          }
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <>
          {poster ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <button
            type="button"
            onClick={() => setLoaded(true)}
            aria-label={`Play ${name} video`}
            className="absolute inset-0 flex items-center justify-center bg-black/30"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white shadow-md">
              <Play className="h-7 w-7 fill-white" />
            </span>
          </button>
        </>
      )}
      {openHref ? (
        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 left-3 z-10 inline-flex h-9 items-center gap-1.5 rounded-full bg-black/70 px-3 text-xs font-semibold text-white"
        >
          Open on {name}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  );
}
