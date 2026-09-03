"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, Zap, Check } from "lucide-react";
import { triggerCartParticleBurst } from "@/components/effects/anime-burst";

interface FloatingCartBarProps {
  productName: string;
  price: number;
  imageUrl?: string;
  visible: boolean;
  onAddToCart?: () => void;
  onBuyNow?: () => void;
}

export function FloatingAddToCartBar({
  productName,
  price,
  imageUrl,
  visible,
  onAddToCart,
  onBuyNow,
}: FloatingCartBarProps) {
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerCartParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    setAdded(true);
    onAddToCart?.();
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-6 inset-x-0 z-40 mx-auto max-w-3xl px-4"
        >
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-background/90 p-3 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex items-center gap-3 min-w-0">
              {imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imageUrl}
                  alt={productName}
                  className="h-11 w-11 rounded-xl object-cover bg-muted border border-border p-0.5 shrink-0"
                />
              )}
              <div className="truncate">
                <p className="text-sm font-bold text-foreground truncate">{productName}</p>
                <p className="text-xs font-mono font-semibold text-primary">Rs. {price.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleAdd}
                className="relative inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold tracking-wide text-primary-foreground shadow-sm transition-all hover:bg-primary-hover active:scale-95"
              >
                {added ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                <span className="hidden min-[370px]:inline">{added ? "Added" : "Add to Cart"}</span>
              </button>

              <button
                type="button"
                onClick={onBuyNow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold tracking-wide text-background shadow-sm transition-all hover:bg-foreground/90 active:scale-95"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span className="hidden min-[370px]:inline">Buy Now</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
