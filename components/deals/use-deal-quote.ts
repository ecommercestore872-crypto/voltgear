"use client";

import { useEffect, useState } from "react";

export type DealQuote = {
  discount: number;
  applied: { title: string; applications: number; discount: number }[];
};

export function useDealQuote(items: { slug: string; quantity: number }[]): DealQuote {
  const [quote, setQuote] = useState<DealQuote>({ discount: 0, applied: [] });

  useEffect(() => {
    if (!items.length) {
      setQuote({ discount: 0, applied: [] });
      return;
    }
    let cancelled = false;
    fetch("/api/deals/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((item) => ({ slug: item.slug, quantity: item.quantity })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setQuote({
          discount: Number(data.discount) || 0,
          applied: Array.isArray(data.applied) ? data.applied : [],
        });
      })
      .catch(() => {
        if (!cancelled) setQuote({ discount: 0, applied: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [items.map((item) => `${item.slug}:${item.quantity}`).join("|")]);

  return quote;
}
