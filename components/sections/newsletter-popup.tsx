"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Mail, Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "voltgear-newsletter-dismissed";
const SHOW_DELAY_MS = 45000;
const RE_SHOW_DAYS = 7;

function wasDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (isNaN(dismissedAt)) return false;
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return daysSince < RE_SHOW_DAYS;
  } catch {
    return false;
  }
}

export function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (wasDismissed()) return;

    let exitedPage = false;

    function onExit(e: MouseEvent) {
      if (e.clientY < 10 && !wasDismissed()) {
        if (!exitedPage) {
          exitedPage = true;
          setOpen(true);
        }
      }
    }

    const timer = setTimeout(() => {
      if (!wasDismissed()) {
        setOpen(true);
      }
    }, SHOW_DELAY_MS);

    document.addEventListener("mouseleave", onExit);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", onExit);
    };
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "popup" }),
      });
      if (!res.ok) throw new Error("fail");
      setSubmitted(true);
      setTimeout(dismiss, 3000);
    } catch {
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-2xl border bg-background shadow-2xl",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
      >
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close newsletter popup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Gift className="h-8 w-8 text-primary" />
          </div>

          {submitted ? (
            <div className="mt-4">
              <h3 className="text-xl font-bold">Thanks!</h3>
              <p className="mt-2 text-muted-foreground">
                We&apos;ve received your request and will be in touch.
              </p>
            </div>
          ) : (
            <>
              <h3 className="mt-4 text-xl font-bold">
                Join the VoltGear Newsletter
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get exclusive deals, new arrivals, and tips delivered to your inbox.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 flex min-w-0 flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="h-11 w-full min-w-0 rounded-lg border bg-background pl-10 pr-4 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
                  />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full px-6 sm:w-auto">
                  {loading ? "..." : "Subscribe"}
                </Button>
              </form>

              <p className="mt-3 text-[11px] text-muted-foreground">
                No spam, ever. Unsubscribe anytime.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
