import type { ReactNode } from "react";

import { CartStaticShell } from "@/components/cart/cart-static-shell";

export default function CartLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CartStaticShell />
      {children}
    </>
  );
}
