import { Manrope, Newsreader } from "next/font/google";

/** Buy n Try: Newsreader display + Manrope UI */
export const gadgetSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-gadget-sans",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const gadgetDisplay = Newsreader({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-gadget-display",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const gadgetFontClass = `${gadgetSans.variable} ${gadgetDisplay.variable}`;
