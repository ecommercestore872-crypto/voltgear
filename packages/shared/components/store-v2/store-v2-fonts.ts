import { Inter, Poppins } from "next/font/google";

export const storeV2Sans = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const storeV2Display = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const storeV2FontClass = `${storeV2Sans.variable} ${storeV2Display.variable}`;
