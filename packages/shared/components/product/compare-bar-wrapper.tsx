"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const CompareBarInner = dynamic(
  () =>
    import("@/components/product/product-comparison").then((m) => m.CompareBar),
  { ssr: false, loading: () => null },
);

export function CompareBarWrapper() {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem("voltgear-compare");
        setSlugs(raw ? JSON.parse(raw) : []);
      } catch {
        setSlugs([]);
      }
    }
    load();
    window.addEventListener("compare-updated", load);
    return () => window.removeEventListener("compare-updated", load);
  }, []);

  if (slugs.length === 0) return null;

  return (
    <CompareBarInner
      slugs={slugs}
      onClear={() => {
        localStorage.removeItem("voltgear-compare");
        setSlugs([]);
        window.dispatchEvent(new Event("compare-updated"));
      }}
      onRemove={(slug) => {
        const next = slugs.filter((s) => s !== slug);
        localStorage.setItem("voltgear-compare", JSON.stringify(next));
        setSlugs(next);
        window.dispatchEvent(new Event("compare-updated"));
      }}
    />
  );
}
