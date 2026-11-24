import localFont from "next/font/local";

/**
 * Buy n Try typography: the same Manrope + Newsreader variable fonts as before, now served through
 * next/font/local (self-hosted, no build-time HTTP). Only the Latin subset is shipped; a variable
 * file already covers every weight in use (400-800), so one file per family replaces six
 * unicode-range faces and one render-blocking font stylesheet. Both families paint above the fold
 * (body copy and the product H1), so both are preloaded.
 */
const manrope = localFont({
  src: "../../../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-gadget-sans",
  adjustFontFallback: "Arial",
});

const newsreader = localFont({
  src: "../../../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-gadget-display",
  adjustFontFallback: "Times New Roman",
});

/** `gadget-fonts` keeps --font-sans/--font-heading in globals.css; the variable classes define the families. */
export const gadgetFontClass = `gadget-fonts ${manrope.variable} ${newsreader.variable}`;
