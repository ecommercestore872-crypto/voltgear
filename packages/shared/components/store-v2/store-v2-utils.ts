import { imageUrl } from "@/lib/sanity/image";
import type { HeroSlide, Product } from "@/lib/types";
import { product2Href } from "@/lib/gadget-preview";

const DEMO_PRODUCT = "/store-v2/demo/products/tws-studio.jpg";

export function storeV2ProductImage(product: Product, width = 800): string {
  const src = product.images?.[0] ?? product.cloudinaryImages?.[0];
  const url = imageUrl(src, { w: width });
  return url || DEMO_PRODUCT;
}

export function storeV2ProductHref(product: Product): string {
  return product2Href(product.slug);
}

export type StoreV2HeroItem = {
  tag: string;
  title: string;
  href: string;
  img: string;
  alt: string;
};

export function mapHeroSlidesToV2(
  slides: HeroSlide[],
  fallback: StoreV2HeroItem[],
): StoreV2HeroItem[] {
  if (!slides.length) return fallback;
  return slides.map((s, i) => ({
    tag: s.subtitle?.split(/[·|–-]/)[0]?.trim() || (i === 0 ? "Featured" : "Shop"),
    title: s.title,
    href: s.product?.slug ? product2Href(s.product.slug) : "/products",
    img: s.imageUrl || fallback[i % fallback.length]?.img || DEMO_PRODUCT,
    alt: s.title,
  }));
}
