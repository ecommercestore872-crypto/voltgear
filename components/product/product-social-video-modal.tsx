"use client";

import { useState } from "react";
import { Play, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductSocialVideoModalProps {
  productName: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  className?: string;
}

export function ProductSocialVideoModal({
  productName,
  instagramUrl,
  tiktokUrl,
  className = "",
}: ProductSocialVideoModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<"instagram" | "tiktok">(
    instagramUrl ? "instagram" : "tiktok",
  );

  if (!instagramUrl && !tiktokUrl) return null;

  const currentUrl = activePlatform === "instagram" ? instagramUrl : tiktokUrl;

  function getEmbedUrl(url?: string, platform?: "instagram" | "tiktok") {
    if (!url) return null;
    if (platform === "instagram") {
      // Clean instagram reel URL to embed format
      const match = url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        return `https://www.instagram.com/reel/${match[1]}/embed/`;
      }
      return url;
    }
    if (platform === "tiktok") {
      // Clean tiktok URL format
      const match = url.match(/video\/(\d+)/);
      if (match && match[1]) {
        return `https://www.tiktok.com/embed/v2/${match[1]}`;
      }
      return url;
    }
    return url;
  }

  const embedSrc = getEmbedUrl(currentUrl, activePlatform);

  return (
    <>
      <div className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (instagramUrl) setActivePlatform("instagram");
            else if (tiktokUrl) setActivePlatform("tiktok");
            setIsOpen(true);
          }}
          className="h-9 px-3.5 rounded-full border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs gap-2 transition-all shadow-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <Play className="w-3.5 h-3.5 fill-primary text-primary" />
          Watch Video Review
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-bold text-sm text-foreground truncate max-w-[280px]">
                  {productName} — Video Demo
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            {instagramUrl && tiktokUrl && (
              <div className="flex border-b border-border/40 bg-muted/10 p-1.5 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActivePlatform("instagram")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    activePlatform === "instagram"
                      ? "bg-white shadow-sm text-pink-600 border border-pink-100"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="2"
                      y="2"
                      width="20"
                      height="20"
                      rx="5"
                      ry="5"
                    ></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  Instagram Reel
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform("tiktok")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    activePlatform === "tiktok"
                      ? "bg-white shadow-sm text-black border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.34 2.88 2.88 0 0 1 2.31-4.52 2.66 2.66 0 0 1 1.04.2v-3.26a5.61 5.61 0 0 0-1.12-.11 6.34 6.34 0 0 0-6.19 7.42 6.3 6.3 0 0 0 7.82 5.2 6.37 6.37 0 0 0 4.67-6.22v-6.9a8.17 8.17 0 0 0 4.66 1.76V7.05a5 5 0 0 1-.77-.36z" />
                  </svg>
                  TikTok Video
                </button>
              </div>
            )}

            {/* Video Container */}
            <div className="relative aspect-[9/16] w-full max-h-[60vh] bg-black flex items-center justify-center overflow-hidden">
              {embedSrc ? (
                <iframe
                  src={embedSrc}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`${productName} ${activePlatform} review`}
                />
              ) : (
                <div className="p-6 text-center text-white/80">
                  <p className="text-sm font-medium">
                    Video preview loading...
                  </p>
                  {currentUrl && (
                    <a
                      href={currentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary underline font-semibold"
                    >
                      Open directly on {activePlatform}{" "}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-muted/20 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                Customer satisfaction video preview
              </span>
              {currentUrl && (
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Open App <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
