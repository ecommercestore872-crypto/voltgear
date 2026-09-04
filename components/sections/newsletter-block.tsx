"use client";

import { useState } from "react";
import { Mail, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewsletterBlock() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "block" }),
      });
      if (!res.ok) throw new Error("fail");
      setSubmitted(true);
    } catch {
      setSubmitted(false);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white py-16 lg:py-24 border-t border-border/40 relative overflow-hidden">
      {/* Decorative gradient blur in background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto max-w-screen-xl px-4 md:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6 shadow-sm border border-primary/10">
            <Gift className="h-8 w-8 text-primary" strokeWidth={2} />
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
            Join the VoltGear VIP Club
          </h2>
          <p className="text-base text-slate-500 mb-8 max-w-lg mx-auto leading-relaxed">
            Get exclusive early access to tech deals, new premium arrivals, and a welcome gift delivered straight to your inbox.
          </p>

          {submitted ? (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-6 font-medium animate-in fade-in zoom-in duration-300">
              <h3 className="text-lg font-bold mb-1">You&apos;re on the list! 🎉</h3>
              <p className="text-sm opacity-90 text-emerald-700">Check your inbox shortly for your exclusive welcome offer.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto relative group">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" strokeWidth={2} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="h-14 w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 text-[15px] font-medium outline-none transition-colors focus:border-primary focus:ring-0 placeholder:text-slate-400 shadow-sm"
                />
              </div>
              <Button type="submit" disabled={loading} className="h-14 px-8 rounded-xl font-bold text-[15px] tracking-wide shadow-sm hover:shadow-md transition-all">
                {loading ? "..." : "Subscribe"}
              </Button>
            </form>
          )}
          
          {!submitted && error ? (
            <p className="mt-4 text-sm text-red-600">Couldn’t subscribe — try again.</p>
          ) : null}
          {!submitted && (
            <p className="mt-4 text-[12px] font-medium text-slate-400 uppercase tracking-widest">
              No spam, ever. Unsubscribe anytime.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
