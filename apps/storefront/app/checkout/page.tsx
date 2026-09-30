import dynamic from "next/dynamic";

const CheckoutPageClient = dynamic(
  () =>
    import("@/components/checkout/checkout-page-client").then(
      (m) => m.default,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="mx-auto min-h-[50vh] max-w-6xl animate-pulse px-4 py-10 lg:px-8"
        aria-busy="true"
      />
    ),
  },
);

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
