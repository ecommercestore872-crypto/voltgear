/** Simple product-style icons for category circles (no external images). */
export function CategoryGlyph({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 64 64",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
  };

  switch (name) {
    case "earbuds":
      return (
        <svg {...common}>
          <ellipse
            cx="32"
            cy="48"
            rx="14"
            ry="4"
            fill="currentColor"
            opacity="0.12"
          />
          <path
            d="M22 22c0-4 3-7 7-7h1v18a5 5 0 0 1-10 0V24c0-1.1.9-2 2-2Zm20 0c1.1 0 2 .9 2 2v9a5 5 0 0 1-10 0V15h1c4 0 7 3 7 7Z"
            fill="currentColor"
            opacity="0.35"
          />
          <path
            d="M24 34h6v10a4 4 0 0 1-8 0V36a2 2 0 0 1 2-2Zm16 0h6a2 2 0 0 1 2 2v8a4 4 0 0 1-8 0V34Z"
            fill="currentColor"
          />
          <circle cx="25" cy="29" r="5.5" fill="currentColor" />
          <circle cx="39" cy="29" r="5.5" fill="currentColor" />
          <circle cx="25" cy="29" r="2" fill="#F5F1E8" opacity="0.9" />
          <circle cx="39" cy="29" r="2" fill="#F5F1E8" opacity="0.9" />
        </svg>
      );
    case "neckband":
      return (
        <svg {...common}>
          <path
            d="M16 28c0-10 7-16 16-16s16 6 16 16v8c0 3-2 5-5 5h-2v-8c0-5-4-9-9-9s-9 4-9 9v8h-2c-3 0-5-2-5-5v-8Z"
            fill="currentColor"
          />
          <circle cx="22" cy="42" r="5" fill="currentColor" opacity="0.35" />
          <circle cx="42" cy="42" r="5" fill="currentColor" opacity="0.35" />
        </svg>
      );
    case "watch":
      return (
        <svg {...common}>
          <rect
            x="22"
            y="8"
            width="20"
            height="10"
            rx="3"
            fill="currentColor"
            opacity="0.35"
          />
          <rect
            x="22"
            y="46"
            width="20"
            height="10"
            rx="3"
            fill="currentColor"
            opacity="0.35"
          />
          <rect
            x="18"
            y="18"
            width="28"
            height="28"
            rx="8"
            fill="currentColor"
          />
          <circle cx="32" cy="32" r="8" fill="#F5F1E8" />
          <path
            d="M32 28v5l4 2"
            stroke="#1F3626"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "headphones":
      return (
        <svg {...common}>
          <path
            d="M14 34v6a6 6 0 0 0 6 6h2V30h-2a6 6 0 0 0-6 4Zm36-4h-2v16h2a6 6 0 0 0 6-6v-6a6 6 0 0 0-6-4Z"
            fill="currentColor"
          />
          <path
            d="M16 32c0-10 7-16 16-16s16 6 16 16"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "speaker":
      return (
        <svg {...common}>
          <rect
            x="20"
            y="12"
            width="24"
            height="40"
            rx="8"
            fill="currentColor"
          />
          <circle cx="32" cy="28" r="7" fill="#F5F1E8" />
          <circle cx="32" cy="44" r="4" fill="#F5F1E8" opacity="0.7" />
        </svg>
      );
    case "dashcam":
      return (
        <svg {...common}>
          <rect
            x="12"
            y="24"
            width="40"
            height="20"
            rx="6"
            fill="currentColor"
          />
          <circle cx="28" cy="34" r="7" fill="#F5F1E8" />
          <circle cx="28" cy="34" r="3" fill="currentColor" />
          <rect
            x="40"
            y="30"
            width="8"
            height="8"
            rx="2"
            fill="#F5F1E8"
            opacity="0.7"
          />
        </svg>
      );
    case "projector":
      return (
        <svg {...common}>
          <rect
            x="10"
            y="26"
            width="44"
            height="18"
            rx="5"
            fill="currentColor"
          />
          <circle cx="26" cy="35" r="7" fill="#F5F1E8" />
          <rect
            x="38"
            y="31"
            width="10"
            height="8"
            rx="2"
            fill="#F5F1E8"
            opacity="0.65"
          />
          <path
            d="M18 44h28"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>
      );
    case "soundbar":
      return (
        <svg {...common}>
          <rect
            x="8"
            y="30"
            width="48"
            height="12"
            rx="6"
            fill="currentColor"
          />
          <circle cx="18" cy="36" r="2.5" fill="#F5F1E8" />
          <circle cx="32" cy="36" r="2.5" fill="#F5F1E8" />
          <circle cx="46" cy="36" r="2.5" fill="#F5F1E8" />
        </svg>
      );
    case "trimmer":
      return (
        <svg {...common}>
          <rect
            x="26"
            y="10"
            width="12"
            height="36"
            rx="4"
            fill="currentColor"
          />
          <path
            d="M24 46h16l-2 8H26l-2-8Z"
            fill="currentColor"
            opacity="0.45"
          />
          <path
            d="M28 14h8M28 20h8M28 26h8"
            stroke="#F5F1E8"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "power":
      return (
        <svg {...common}>
          <rect
            x="18"
            y="14"
            width="28"
            height="36"
            rx="6"
            fill="currentColor"
          />
          <path
            d="M32 24v8l5 3"
            stroke="#F5F1E8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <rect
            x="26"
            y="44"
            width="12"
            height="3"
            rx="1.5"
            fill="#F5F1E8"
            opacity="0.6"
          />
        </svg>
      );
    case "charger":
      return (
        <svg {...common}>
          <rect
            x="22"
            y="16"
            width="20"
            height="28"
            rx="4"
            fill="currentColor"
          />
          <path
            d="M28 44v8M36 44v8"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M30 24h4v8h-4z" fill="#F5F1E8" />
        </svg>
      );
    case "cable":
      return (
        <svg {...common}>
          <path
            d="M18 20h10v8H18a4 4 0 0 1-4-4 4 4 0 0 1 4-4Zm28 16H36v8h10a4 4 0 0 0 4-4 4 4 0 0 0-4-4Z"
            fill="currentColor"
          />
          <path
            d="M28 24h8a8 8 0 0 1 8 8"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="14" fill="currentColor" opacity="0.2" />
          <circle cx="32" cy="32" r="8" fill="currentColor" />
        </svg>
      );
  }
}

export const EXTRA_CATEGORY_TILES: {
  label: string;
  href: string;
  glyph: string;
}[] = [
  { label: "True Wireless", href: "/products2/earbuds", glyph: "earbuds" },
  { label: "Neckbands", href: "/products2?q=neckband", glyph: "neckband" },
  { label: "Smart Watches", href: "/products2/smartwatch", glyph: "watch" },
  {
    label: "Wireless Headphones",
    href: "/products2?q=headphones",
    glyph: "headphones",
  },
  {
    label: "Wireless Speakers",
    href: "/products2?q=speaker",
    glyph: "speaker",
  },
  { label: "Dashcams", href: "/products2?q=dashcam", glyph: "dashcam" },
  { label: "Projectors", href: "/products2?q=projector", glyph: "projector" },
  { label: "Soundbars", href: "/products2?q=soundbar", glyph: "soundbar" },
  { label: "Trimmers", href: "/products2?q=trimmer", glyph: "trimmer" },
  { label: "Power Banks", href: "/products2/power-bank", glyph: "power" },
  { label: "Chargers", href: "/products2/charger", glyph: "charger" },
  { label: "Cables", href: "/products2?q=cable", glyph: "cable" },
];
