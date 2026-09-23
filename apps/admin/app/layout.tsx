import type { Metadata } from "next";

import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { cn } from "@/lib/utils";

import "./globals.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn(gadgetFontClass, "min-h-dvh bg-background")}>
        {children}
      </body>
    </html>
  );
}