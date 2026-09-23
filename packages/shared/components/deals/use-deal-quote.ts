"use client";

import { useEffect, useState } from "react";

export type DealQuote = {
  discount: number;
  applied: { title: string; applications: number; discount: number }[];
  /** False while a quote request is in flight for the current cart lines. */
  ready: boolean;
};

function cartKey(items: { slug: string; quantity: number }[]): string {
  return items.map((item) => `${item.slug}:${item.quantity}`).join("|");
}

export function useDealQuote(
  items: { slug: string; quantity: number }[],
): DealQuote {
  const [quote, setQuote] = useState<DealQuote>({
    discount: 0,
    applied: [],
    ready: items.length === 0,
  });

  useEffect(() => {
    if (!items.length) {
      setQuote({ discount: 0, applied: [], ready: true });
      return;
    }
    let cancelled = false;
    setQuote((prev) => ({ ...prev, ready: false }));
    fetch("/api/deals/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((item) => ({
          slug: item.slug,
          quantity: item.quantity,
        })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setQuote({
          discount: Number(data.discount) || 0,
          applied: Array.isArray(data.applied) ? data.applied : [],
          ready: true,
        });
      })
      .catch(() => {
        if (!cancelled) setQuote({ discount: 0, applied: [], ready: true });
      });
    return () => {
      cancelled = true;
    };
  }, [cartKey(items)]);

  return quote;
}
