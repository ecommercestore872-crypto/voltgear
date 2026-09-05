"use client";

import { useState } from "react";
import { Bell, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BackInStockNotification({ productName }: { productName: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "back-in-stock", product: productName }),
      });
    } catch {}
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        <Check className="h-4 w-4 shrink-0" />
        We&rsquo;ll notify you at <strong className="ml-1">{email}</strong> when this product is back in stock.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-muted/40 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Bell className="h-4 w-4" />
        Get notified when back in stock
      </div>
      <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="min-w-0 flex-1"
        />
        <Button type="submit" size="sm" className="h-11 w-full sm:w-auto">
          Notify Me
        </Button>
      </form>
    </div>
  );
}
