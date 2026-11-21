import { product2Href } from "@/lib/gadget-preview";

export type GadgetProductBanner = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  href: string;
  ctaLabel: string;
  /** Four short facts taken from the product's catalog copy. */
  features: [string, string, string, string];
  /** CSS background for the banner. */
  gradient: string;
};

/**
 * Homepage hero: two product banners. Every line of copy comes from the
 * product's own catalog entry (scripts/data/earbuds-catalog.ts and
 * scripts/seed-powerbanks.ts) — no prices, ratings or sales claims.
 */
export const GADGET_PRODUCT_BANNERS: GadgetProductBanner[] = [
  {
    id: "banner-buds-pro-3",
    eyebrow: "ANC + ENC Earbuds",
    title: "Buds Pro 3",
    subtitle: "Noise control for music and calls",
    image: "/gadget/products/earbuds-buds-pro-3.webp",
    imageAlt: "Buds Pro 3 ANC + ENC earbuds in their charging case",
    href: product2Href("buds-pro-3"),
    ctaLabel: "Shop Buds Pro 3",
    features: ["ANC + ENC", "Up to 36H battery", "Bluetooth 5.3", "Touch controls"],
    gradient:
      "linear-gradient(135deg, #062c40 0%, #0b6f8a 52%, #34b6c4 100%)",
  },
  {
    id: "banner-baseus-65w",
    eyebrow: "Laptop Power Bank",
    title: "Baseus 65W",
    subtitle: "20,000mAh power for laptops and phones",
    image: "/gadget/products/powerbank-baseus-65w-20000.webp",
    imageAlt: "Baseus 65W 20000mAh laptop power bank",
    href: product2Href("baseus-65w-20000mah-laptop-power-bank"),
    ctaLabel: "Shop Baseus 65W",
    features: [
      "65W USB-C PD",
      "20,000mAh",
      "60W fast recharge",
      "PD 3.0 · QC 4.0",
    ],
    gradient:
      "linear-gradient(135deg, #a61e4d 0%, #e8590c 58%, #f59f00 100%)",
  },
];
