"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

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
