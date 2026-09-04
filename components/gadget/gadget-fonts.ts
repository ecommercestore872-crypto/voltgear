import { Manrope, Newsreader } from "next/font/google";

/** Buy n Try: Newsreader display + Manrope UI */
export const gadgetSans = Manrope({
  subsets: ["latin"],
  variable: "--font-gadget-sans",
  display: "swap",
  preload: false,
});

export const gadgetDisplay = Newsreader({
  subsets: ["latin"],
  variable: "--font-gadget-display",
  display: "swap",
  preload: false,
});

export const gadgetFontClass = `${gadgetSans.variable} ${gadgetDisplay.variable}`;
