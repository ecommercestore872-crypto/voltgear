import type { ReactNode } from "react";

import { CheckoutStaticShell } from "@/components/checkout/checkout-static-shell";

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CheckoutStaticShell />
      {children}
    </>
  );
}
