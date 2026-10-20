import CheckoutPageClient from "@/components/checkout/checkout-page-client";
import { CheckoutStaticShell } from "@/components/checkout/checkout-static-shell";

export default function CheckoutPage() {
  return (
    <>
      <CheckoutStaticShell />
      <CheckoutPageClient />
    </>
  );
}
