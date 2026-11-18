"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

export function GadgetFooterNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">(
    "idle",
  );

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
      <p className="text-sm font-bold text-[var(--g-charcoal)]">Get exclusive offers and updates</p>
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
          className="h-12 w-full min-w-0 rounded-2xl border border-transparent bg-[#f1f1f1] pl-4 pr-14 text-base text-[var(--g-charcoal)] outline-none placeholder:text-[var(--g-taupe)] focus:border-[var(--g-forest)] sm:text-sm"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          aria-label="Subscribe"
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--g-forest)] text-white transition hover:bg-[var(--g-sage)] disabled:opacity-60"
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
        <p className="mt-2 text-xs font-semibold text-emerald-700">You’re on the list.</p>
      ) : null}
      {status === "err" ? (
        <p className="mt-2 text-xs text-red-600">
          Couldn’t subscribe — try again.
        </p>
      ) : null}
    </div>
  );
}
