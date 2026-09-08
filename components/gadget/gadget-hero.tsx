import Image from "next/image";
import Link from "next/link";

import { gadgetImageSrc } from "@/components/gadget/gadget-image";
import { salePercent } from "@/components/gadget/gadget-sale";
import { product2Href } from "@/lib/gadget-preview";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { getStockState } from "@/lib/stock";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

function whisperLine(codEnabled: boolean, threshold: number): string | null {
  const parts: string[] = [];
  if (codEnabled) parts.push("Cash on delivery");
  if (threshold > 0) parts.push(`Free shipping over ${formatPrice(threshold)}`);
  if (!parts.length) return null;
  return parts.join(" · ");
}

const ctaClass =
  "inline-flex min-h-11 items-center justify-center rounded-sm px-6 text-sm font-black uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-golden-400";

const HERO_MIN = "min-h-[60dvh] sm:min-h-[75dvh] lg:min-h-[calc(100dvh-4rem)]";

export function GadgetHero({
  headline,
  subheadline,
  product,
  codEnabled,
  freeShippingThreshold,
}: {
  headline: string;
  subheadline?: string;
  product: Product | null;
  codEnabled: boolean;
  freeShippingThreshold: number;
}) {
  const image = product ? gadgetImageSrc(product, PRODUCT_IMAGE.gallery) : null;
  const href = product ? product2Href(product.slug) : "/products";
  const off = product ? salePercent(product.price, product.compareAtPrice) : null;
  const soldOut = product ? getStockState(product.stockStatus).soldOut : false;
  const whisper = whisperLine(codEnabled, freeShippingThreshold);
  const priceNow = product ? formatPrice(product.price) : "";
  const priceWas =
    product && off && product.compareAtPrice ? formatPrice(product.compareAtPrice) : "";

  return (
    <section className={`flex flex-col overflow-hidden bg-zinc-950 text-white ${HERO_MIN}`}>
      <div
        className={`grid flex-1 ${HERO_MIN} ${
          image
            ? "grid-rows-[auto_minmax(42vh,1fr)] lg:grid-cols-5 lg:grid-rows-none"
            : ""
        }`}
      >
        <div
          className={`flex flex-col justify-center px-4 py-10 lg:px-8 ${
            image ? "lg:col-span-2" : ""
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-golden-400">
            Shop the drop
          </p>
          <h1 className="mt-3 max-w-xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
            {headline}
          </h1>
          {subheadline ? (
            <p className="mt-4 max-w-lg text-base text-zinc-300 sm:text-lg">{subheadline}</p>
          ) : null}

          {product ? (
            <div className="mt-6">
              <p
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                aria-label={
                  off ? `${priceNow}, was ${priceWas}, ${off} percent off` : priceNow
                }
              >
                <span className="text-3xl font-black sm:text-4xl">{priceNow}</span>
                {off && product.compareAtPrice ? (
                  <>
                    <span className="text-lg text-zinc-500 line-through">{priceWas}</span>
                    <span className="text-sm font-black text-golden-400">–{off}%</span>
                  </>
                ) : null}
              </p>
              {soldOut ? (
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Sold out
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={href}
              aria-label={product ? `Shop ${product.name} now` : "Shop all electronic categories"}
              className={`${ctaClass} bg-golden-400 text-zinc-950 hover:bg-golden-300 min-h-[44px]`}
            >
              {product ? "Shop now" : "Shop categories"}
            </Link>
            {product ? (
              <Link
                href="/products2"
                aria-label="Browse all electronics catalog"
                className={`${ctaClass} border border-zinc-600 hover:border-white min-h-[44px]`}
              >
                Browse all
              </Link>
            ) : null}
          </div>

          {whisper ? <p className="mt-4 text-sm text-zinc-400">{whisper}</p> : null}
        </div>

        {image ? (
          <div className="relative min-h-[42vh] lg:col-span-3 lg:min-h-0">
            <Image
              src={image}
              alt={product?.name || headline}
              fill
              priority
              quality={90}
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-contain"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
