"use client";

import { useState } from "react";

export function StoreV2NewsletterBand() {
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
    <section className="sv2-dispatch" aria-labelledby="sv2-dispatch-heading">
      <div className="sv2-container sv2-dispatch-inner">
        <div>
          <p className="sv2-eyebrow sv2-eyebrow--light">Dispatch</p>
          <h2 id="sv2-dispatch-heading">Deals &amp; restocks in your inbox</h2>
          <p className="sv2-dispatch-lead">No spam — unsubscribe anytime. COD drops and PostEx tracking tips.</p>
        </div>
        <form className="sv2-dispatch-form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="sv2-newsletter-email">
            Email
          </label>
          <input
            id="sv2-newsletter-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status !== "idle" && status !== "loading") setStatus("idle");
            }}
          />
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "…" : "Join"}
          </button>
        </form>
        {status === "ok" ? <p className="sv2-dispatch-msg sv2-dispatch-msg--ok">You&apos;re on the list.</p> : null}
        {status === "err" ? (
          <p className="sv2-dispatch-msg sv2-dispatch-msg--err">Couldn&apos;t subscribe — try again.</p>
        ) : null}
      </div>
    </section>
  );
}
