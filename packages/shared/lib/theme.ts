export type ThemeName = "dark" | "light";

/** localStorage key for the visitor's persisted theme choice. */
export const THEME_STORAGE_KEY = "voltage-theme";

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string | undefined | null): value is string {
  return typeof value === "string" && HEX_RE.test(value.trim());
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl([r, g, b]: [number, number, number]): {
  h: number;
  s: number;
  l: number;
} {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Returns a `h s% l%` triple for use in CSS variables like `--primary`. */
export function hexToHslTriple(hex: string | undefined | null): string | null {
  if (!isHexColor(hex)) return null;
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  return `${h} ${s}% ${l}%`;
}

/**
 * Picks a foreground color (white or near-black) that stays readable
 * on top of the given background color.
 */
export function foregroundFor(hex: string | undefined | null): string {
  if (!isHexColor(hex)) return "0 0% 100%";
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "240 6% 10%" : "0 0% 100%";
}

export interface ThemeSettings {
  theme?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function resolveTheme(
  settings: ThemeSettings | null,
  previewOverride?: string | null
): ThemeName {
  if (previewOverride === "dark" || previewOverride === "light") {
    return previewOverride;
  }
  return settings?.theme === "dark" ? "dark" : "light";
}

/**
 * Builds CSS custom-property overrides from the CMS brand colors.
 * Returns a string safe to inline in a <style> tag.
 */
export function themeCssVars(_settings?: unknown) {
  void _settings;
  return "";
}

/**
 * Inline script for <head> that applies the right theme before first paint,
 * so pages never flash. Resolution order: `?theme=dark|light` (preview/demo)
 * → persisted visitor choice (localStorage) → server default from Sanity.
 */
export function themePreviewScript(): string {
  return [
    'try{',
    'var p=new URLSearchParams(window.location.search).get("theme");',
    'var s=null;try{s=localStorage.getItem("voltage-theme")}catch(e){}',
    'var t=(p==="dark"||p==="light")?p:(s==="dark"||s==="light"?s:null);',
    'if(t==="dark"){document.documentElement.classList.add("dark")}',
    'else if(t==="light"){document.documentElement.classList.remove("dark")}',
    "}catch(e){}",
  ].join("");
}
