import { CheckoutPageGate } from "@/components/checkout/checkout-page-gate";
import { CheckoutStaticShell } from "@/components/checkout/checkout-static-shell";

export default function CheckoutPage() {
  return (
    <>
      <CheckoutStaticShell />
      <CheckoutPageGate />
    </>
  );
}
