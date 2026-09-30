import dynamic from "next/dynamic";

const CartPageClient = dynamic(() => import("./cart-page-client"), {
  ssr: false,
  loading: () => (
    <div
      className="mx-auto min-h-[40vh] max-w-6xl animate-pulse px-4 py-10 lg:px-8"
      aria-busy="true"
    />
  ),
});

export default function CartPage() {
  return <CartPageClient />;
}
