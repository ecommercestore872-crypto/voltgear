import dynamic from "next/dynamic";

const CheckoutPageClient = dynamic(
  () =>
    import("@/components/checkout/checkout-page-client").then(
      (m) => m.default,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
