/** Static collection tiles (imagery in /public/store-v2/demo/collections). */
export const STORE_V2_COLLECTIONS = [
  {
    href: "/collections/road-trip",
    index: "01",
    title: "Road trip loadout",
    count: 18,
    tag: "Drive",
    img: "/store-v2/demo/collections/road-trip.jpg",
    layout: "feature" as const,
  },
  {
    href: "/collections/desk-setup",
    index: "02",
    title: "Desk setup",
    count: 31,
    tag: "Work",
    img: "/store-v2/demo/collections/desk-setup.jpg",
    layout: "tall" as const,
  },
  {
    href: "/products/earbuds",
    index: "03",
    title: "Gym & run",
    count: 14,
    tag: "Audio",
    img: "/store-v2/demo/collections/gym-run.jpg",
    layout: "tile" as const,
  },
  {
    href: "/collections/best-offers",
    index: "04",
    title: "Gifts under Rs 3k",
    count: 26,
    tag: "COD",
    img: "/store-v2/demo/collections/gifts.jpg",
    layout: "wide" as const,
  },
  {
    href: "/collections/featured",
    index: "05",
    title: "Creator kit",
    count: 12,
    tag: "Pro",
    img: "/store-v2/demo/collections/creator.jpg",
    layout: "tile" as const,
  },
  {
    href: "/cod/lahore",
    index: "06",
    title: "COD · Lahore",
    count: 64,
    tag: "Local",
    img: "/store-v2/demo/collections/cod-lahore.jpg",
    layout: "accent" as const,
  },
];

export const STORE_V2_HERO_FALLBACK = [
  {
    tag: "New drop",
    title: "Studio TWS Pro",
    href: "/products",
    img: "/store-v2/demo/hero/hero-1.jpg",
  },
  {
    tag: "Power",
    title: "66W GaN charger",
    href: "/products/charger",
    img: "/store-v2/demo/hero/hero-2.jpg",
  },
  {
    tag: "Drive",
    title: "Car charging hub",
    href: "/collections/road-trip",
    img: "/store-v2/demo/hero/hero-3.jpg",
  },
  {
    tag: "COD",
    title: "Pay on delivery",
    href: "/products",
    img: "/store-v2/demo/hero/hero-4.jpg",
  },
];
