import { Manrope } from "next/font/google";

/** Admin UI only — single font keeps first paint fast (no Newsreader). */
export const adminSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-gadget-sans",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const adminFontClass = adminSans.variable;
