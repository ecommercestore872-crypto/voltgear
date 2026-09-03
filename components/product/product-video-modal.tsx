"use client";

import React, { useState } from "react";
import { Play, X, Video, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { videoEmbedSrc, videoKind } from "@/lib/gadget-preview";

interface ProductVideoModalProps {
  videoUrl?: string;
  tiktokUrl?: string;
  instagramUrl?: string;
  productName: string;
}

export function ProductVideoModal({ videoUrl, tiktokUrl, instagramUrl, productName }: ProductVideoModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);

  function getSafeEmbed(url?: string): string | null {
    if (!url) return null;
    const kind = videoKind(url);
    if (kind === "instagram" || kind === "tiktok") return videoEmbedSrc(kind, url);
    return url;
  }

  // Determine the default embed if opened
  const defaultEmbed = getSafeEmbed(videoUrl) || getSafeEmbed(tiktokUrl) || getSafeEmbed(instagramUrl);

  if (!videoUrl && !tiktokUrl && !instagramUrl) {
    return null; /* Hide if no videos available */
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActiveMedia(defaultEmbed);
          setIsOpen(true);
        }}
        className="group inline-flex h-10 w-fit items-center gap-2 rounded-full border-[1.5px] border-[var(--g-forest)] px-4 text-xs font-black uppercase tracking-wide text-[var(--g-forest)] transition hover:bg-[var(--g-forest)] hover:text-white"
      >
        <Play className="h-3.5 w-3.5 fill-[var(--g-forest)] text-[var(--g-forest)] transition group-hover:fill-white group-hover:text-white" />
        <span>Watch Demo Video</span>
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
             className="relative flex flex-col w-[95vw] max-w-[400px] h-[85vh] max-h-[800px] bg-black rounded-2xl shadow-2xl overflow-hidden border border-white/20"
             onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close video"
              className="absolute top-3 right-3 h-11 w-11 rounded-full bg-white text-black shadow-2xl flex items-center justify-center hover:scale-105 active:scale-90 transition-all z-20"
              style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}
            >
              <X className="h-6 w-6 stroke-[2.5]" />
            </button>

            <div className="p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 inset-x-0 z-10 text-white space-y-0.5 pointer-events-none">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> VoltGear Verified Demo
              </span>
              <h3 className="text-sm font-bold truncate pr-10 max-w-full">{productName}</h3>
            </div>

            <div className="relative flex-1 w-full bg-neutral-900 flex flex-col items-center justify-center overflow-hidden min-h-[300px]">
              {activeMedia ? (
                <iframe
                  src={activeMedia}
                  className={cn(
                    "w-full border-0 absolute z-0",
                    activeMedia.includes("instagram.com") || activeMedia.includes("tiktok.com")
                      ? "h-[calc(100%+230px)] -top-[80px] pointer-events-auto"
                      : "h-full inset-0 pointer-events-auto"
                  )}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  scrolling="no"
                />
              ) : (
                <div className="p-6 text-center space-y-3 text-white z-10">
                  <div className="h-16 w-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                    <Video className="h-8 w-8" />
                  </div>
                  <h4 className="font-bold text-base">Watch Live Hands-On Reel</h4>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    Check out unboxing & charging speed test on our official Instagram & TikTok channel.
                  </p>
                </div>
              )}
            </div>

            {Boolean(videoUrl || tiktokUrl || instagramUrl) && (
              <div className="p-3 bg-neutral-950 flex flex-wrap justify-center gap-2 relative z-10 border-t border-white/10">
                {tiktokUrl && (
                  <Button
                    onClick={() => window.open(tiktokUrl, "_blank")}
                    className="bg-black text-white hover:bg-neutral-800 text-xs font-bold px-4 py-2 h-auto rounded-xl flex items-center gap-1.5 border border-white/20 transition-all flex-1"
                  >
                    Open in TikTok
                    <ExternalLink className="h-3 w-3 ml-1 opacity-70" />
                  </Button>
                )}
                {instagramUrl && (
                  <Button
                    onClick={() => window.open(instagramUrl, "_blank")}
                    className="bg-gradient-to-br flex-1 from-pink-600 via-rose-600 to-purple-600 border-0 text-white font-bold tracking-tight text-xs rounded-xl px-4 py-2 h-auto shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    Open in Instagram
                    <ExternalLink className="h-3 w-3 ml-1 opacity-70" />
                  </Button>
                )}
                {(!tiktokUrl && !instagramUrl && videoUrl) && (
                  <Button
                    onClick={() => window.open(videoUrl, "_blank")}
                    className="bg-white text-black hover:bg-neutral-200 text-xs font-bold px-4 py-2 h-auto rounded-xl flex items-center justify-center gap-1.5 transition-all flex-1"
                  >
                    Open Original Source
                    <ExternalLink className="h-3 w-3 ml-1 opacity-70" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
