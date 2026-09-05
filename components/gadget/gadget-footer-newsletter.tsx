"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

export function GadgetFooterNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("fail");
      setStatus("ok");
      setEmail("");
    } catch {
      setStatus("err");
    }
  }

  return (
    <div>
      <p className="text-sm text-white/75">Get exclusive offers and updates.</p>
      <form onSubmit={onSubmit} className="relative mt-3">
        <label htmlFor="gadget-footer-email" className="sr-only">
          Email address
        </label>
        <input
          id="gadget-footer-email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== "idle" && status !== "loading") setStatus("idle");
          }}
          placeholder="Email address"
          className="h-12 w-full min-w-0 rounded-full border border-white/35 bg-transparent pl-5 pr-14 text-base text-[var(--g-white)] outline-none placeholder:text-white/45 focus:border-[var(--g-sage)] sm:text-sm"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          aria-label="Subscribe"
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--g-white)] text-[var(--g-forest)] transition hover:bg-[var(--g-cream)] disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "ok" ? (
            <Check className="h-4 w-4" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </form>
      {status === "ok" ? (
        <p className="mt-2 text-xs text-[var(--g-sage)]">You’re on the list.</p>
      ) : null}
      {status === "err" ? (
        <p className="mt-2 text-xs text-red-300">Couldn’t subscribe — try again.</p>
      ) : null}
    </div>
  );
}
