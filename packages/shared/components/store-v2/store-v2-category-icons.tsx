import type { ReactNode } from "react";

const icons: Record<string, ReactNode> = {
  audio: (
    <svg viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <path
        d="M36 52c0-14 11-25 28-25s28 11 28 25v24c0 14-11 25-28 25s-28-11-28-25V52z"
        stroke="#1a1a1a"
        strokeWidth="3"
      />
      <ellipse cx="36" cy="64" rx="12" ry="18" fill="#f5d000" stroke="#1a1a1a" strokeWidth="2.5" />
      <ellipse cx="92" cy="64" rx="12" ry="18" fill="#f5d000" stroke="#1a1a1a" strokeWidth="2.5" />
    </svg>
  ),
  earbuds: (
    <svg viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <path
        d="M36 52c0-14 11-25 28-25s28 11 28 25v24c0 14-11 25-28 25s-28-11-28-25V52z"
        stroke="#1a1a1a"
        strokeWidth="3"
      />
      <ellipse cx="36" cy="64" rx="12" ry="18" fill="#f5d000" stroke="#1a1a1a" strokeWidth="2.5" />
      <ellipse cx="92" cy="64" rx="12" ry="18" fill="#f5d000" stroke="#1a1a1a" strokeWidth="2.5" />
    </svg>
  ),
  charger: (
    <svg viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <rect x="44" y="32" width="40" height="64" rx="12" fill="#fff" stroke="#1a1a1a" strokeWidth="3" />
      <path
        d="M72 48 56 72h16l-8 28 32-36H72z"
        fill="#f5d000"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  chargers: (
    <svg viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <rect x="44" y="32" width="40" height="64" rx="12" fill="#fff" stroke="#1a1a1a" strokeWidth="3" />
      <path
        d="M72 48 56 72h16l-8 28 32-36H72z"
        fill="#f5d000"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  cable: (
    <svg viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <path d="M28 68c0-20 16-36 36-36" stroke="#0d9488" strokeWidth="4" strokeLinecap="round" />
      <rect x="22" y="58" width="16" height="20" rx="4" fill="#1a1a1a" />
      <rect x="90" y="50" width="16" height="20" rx="4" fill="#f5d000" stroke="#1a1a1a" strokeWidth="2" />
    </svg>
  ),
  case: (
    <svg viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <rect x="40" y="24" width="48" height="80" rx="14" fill="#fff" stroke="#1a1a1a" strokeWidth="3" />
      <rect x="48" y="36" width="32" height="56" rx="6" fill="#e8e6e1" />
    </svg>
  ),
  smartwatch: (
    <svg viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <rect x="36" y="40" width="56" height="48" rx="16" fill="#fff" stroke="#1a1a1a" strokeWidth="3" />
      <circle cx="64" cy="64" r="16" stroke="#0d9488" strokeWidth="3" />
    </svg>
  ),
  car: (
    <svg viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <path
        d="M32 76h64l-10-28H42L32 76z"
        fill="#f5d000"
        stroke="#1a1a1a"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="80" r="9" fill="#1a1a1a" />
      <circle cx="80" cy="80" r="9" fill="#1a1a1a" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="28" fill="#f5d000" stroke="#1a1a1a" strokeWidth="3" />
    </svg>
  ),
};

export function StoreV2CategoryIcon({ slug }: { slug: string }) {
  const key = slug in icons ? slug : "default";
  return <span className="sv2-cat-icon-art">{icons[key]}</span>;
}
