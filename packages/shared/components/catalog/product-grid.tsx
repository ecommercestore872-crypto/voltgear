"use client";

import Link from "next/link";

import { ProductCard } from "@/components/product/product-card";
import { useGadgetPreview } from "@/components/gadget/use-gadget-preview";
import { products2Href } from "@/lib/gadget-preview";
import type { Product } from "@/lib/types";

export function ProductGrid({ items }: { items: Product[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 sm:gap-x-5 sm:gap-y-10">
      {items.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}

export function EmptyState({
  message,
  actionLabel,
  actionHref,
}: {
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  const gadget = useGadgetPreview();
  const href =
    actionHref === "/products" && gadget ? products2Href() : actionHref;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <p className="text-lg font-medium">{message}</p>
      {actionLabel && href && (
        <Link href={href} className="inline-flex items-center justify-center">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
