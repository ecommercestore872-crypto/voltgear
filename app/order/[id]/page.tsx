import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Banknote,
  Calendar,
  Check,
  ClipboardList,
  Headphones,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { OrderEmailGate } from "@/components/order/order-email-gate";
import { getOrderByPublicId, fetchSiteSettings } from "@/lib/db/store";
import { normalizeSettings } from "@/lib/site-config";
import { shopperLookupNotFound } from "@/lib/db/order-rules";
import {
  buildOrderBillLines,
  buildOrderProgressSteps,
  resolveOrderSubtotal,
} from "@/lib/order-bill-rules";
import { formatPrice } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const STEP_ICON: Partial<Record<OrderStatus, typeof Check>> = {
  new: Check,
  processing: Package,
  shipped: Truck,
  delivered: Home,
  cancelled: X,
};

export default async function OrderSuccessPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { email?: string };
}) {
  const order = await getOrderByPublicId(params.id);
  if (!order) notFound();

  const email = typeof searchParams?.email === "string" ? searchParams.email.trim() : "";
  if (!email) {
    return <OrderEmailGate orderId={params.id} />;
  }
  if (shopperLookupNotFound(order, email)) {
    notFound();
  }

  const { customer, items = [], orderId, createdAt } = order;
  const status = (order.status ?? "new") as OrderStatus;
  const isCod = order.payment === "cod";
  const rawSettings = await fetchSiteSettings().catch(() => null);
  const config = normalizeSettings(rawSettings);
  const progress = buildOrderProgressSteps(status);
  const billLines = buildOrderBillLines({
    orderId,
    items: items.map((i) => ({
      name: i.name ?? "Item",
      price: i.price ?? 0,
      quantity: i.quantity ?? 1,
      variantName: i.variantName,
    })),
    subtotal: resolveOrderSubtotal({ subtotal: order.subtotal, items }),
    shipping: order.shipping ?? 0,
    discount: order.discount,
    promoCode: order.promoCode,
    giftWrapFee: /\bgift wrap requested\b/i.test(customer?.note ?? "")
      ? 199
      : 0,
    total: order.total ?? 0,
  });
  const cancelled = status === "cancelled";

  return (
    <div className="min-h-screen border-t border-[var(--g-line)] bg-[var(--g-cream)] pb-16 pt-8 text-[var(--g-charcoal)] lg:pb-32 lg:pt-12">
      <div className="container mx-auto max-w-6xl space-y-6 px-4 lg:px-8">
        <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_minmax(16rem,28rem)]">
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-[var(--g-line)] bg-[var(--g-cream-deep)] p-6 sm:flex-row sm:items-start sm:p-8">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${
                cancelled ? "bg-[var(--g-danger,#b42318)]" : "bg-[var(--g-forest)]"
              }`}
            >
              {cancelled ? (
                <X className="h-8 w-8 text-[var(--g-cream)]" strokeWidth={2} />
              ) : (
                <Check className="h-8 w-8 text-[var(--g-cream)]" strokeWidth={2} />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g-sage)]">
                {cancelled ? "Order update" : "Thank you"}
              </p>
              <h1 className="gadget-display text-3xl tracking-tight text-[var(--g-charcoal)] sm:text-[34px]">
                {cancelled ? "Order cancelled" : "Order confirmed"}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--g-taupe)] sm:mx-0">
                {cancelled
                  ? "This order is cancelled. Nothing is due on delivery."
                  : "Your order has been placed. We’ll get it ready to ship as soon as possible."}
              </p>
              <p className="mt-3 text-sm font-bold text-[var(--g-forest)]">
                Status:{" "}
                <span className="uppercase tracking-wide">
                  {progress.find((s) => s.state === "current")?.label ?? status}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-6 shadow-sm sm:p-8">
            <div
              className={`relative mx-auto grid w-full max-w-[420px] text-center ${
                progress.length === 2 ? "grid-cols-2" : "grid-cols-4"
              }`}
            >
              <div
                className="absolute left-[12.5%] right-[12.5%] top-4 -z-10 h-[2px] border-t-2 border-dashed border-[var(--g-line)]"
                aria-hidden
              />
              {progress.map((step) => {
                const Icon = STEP_ICON[step.key] ?? Package;
                const active = step.state === "current" || step.state === "complete";
                return (
                  <div
                    key={step.key}
                    className={`flex flex-col items-center gap-3 ${
                      step.state === "upcoming" ? "opacity-40" : step.state === "complete" ? "opacity-90" : ""
                    }`}
                  >
                    <div
                      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full outline outline-[4px] outline-[var(--g-white)] shadow-sm ${
                        active
                          ? "bg-[var(--g-forest)] text-[var(--g-white)]"
                          : "border border-[var(--g-line)] bg-[var(--g-cream)] text-[var(--g-taupe)]"
                      }`}
                    >
                      {step.state === "complete" || step.state === "current" ? (
                        <Icon className="h-4 w-4" strokeWidth={step.key === "new" ? 3 : 2} />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="mt-1">
                      <p
                        className={`text-xs font-bold ${
                          active ? "text-[var(--g-charcoal)]" : "text-[var(--g-taupe)]"
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.state === "current" && step.key === "new" ? (
                        <p className="mt-1 text-[10px] font-semibold text-[var(--g-forest)]">
                          {new Date(createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)]">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] shadow-sm">
            <div className="flex items-center gap-3 border-b border-[var(--g-line)] bg-[var(--g-cream)]/50 p-5">
              <ClipboardList className="h-5 w-5 text-[var(--g-forest)]" strokeWidth={2.5} />
              <h3 className="text-[15px] font-bold text-[var(--g-charcoal)]">Order details</h3>
            </div>
            <div className="grid gap-x-6 gap-y-7 p-6 sm:grid-cols-2">
              <Detail
                icon={<span className="text-sm font-bold">#</span>}
                label="Order number"
                value={orderId}
                accent
              />
              <Detail
                icon={<Mail className="h-4 w-4" />}
                label="Confirmation email"
                value={customer?.email || "—"}
              />
              <Detail
                icon={<Calendar className="h-4 w-4" />}
                label="Order date"
                value={new Date(createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                })}
              />
              <Detail
                icon={<Truck className="h-4 w-4" />}
                label="Estimated delivery"
                value={
                  cancelled
                    ? "—"
                    : `${new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })} – ${new Date(Date.now() + 5 * 86400000).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}`
                }
                hint={cancelled ? undefined : "(2–4 working days)"}
              />
              <Detail
                icon={<Banknote className="h-4 w-4" />}
                label="Payment method"
                value={isCod ? "Cash on Delivery (COD)" : "Prepaid"}
              />
              <Detail
                icon={<MapPin className="h-4 w-4" />}
                label="Shipping address"
                value={customer?.name || ""}
                hint={[customer?.address, customer?.city, "Pakistan"].filter(Boolean).join(", ")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--g-line)] bg-[var(--g-cream)]/50 p-5">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-[var(--g-forest)]" strokeWidth={2.5} />
                  <h3 className="text-[14px] font-bold text-[var(--g-charcoal)]">
                    Items ({items.length})
                  </h3>
                </div>
              </div>
              <ul className="max-h-[280px] flex-1 divide-y divide-[var(--g-line)] overflow-y-auto p-5">
                {items.length === 0 ? (
                  <li className="py-8 text-center text-sm text-muted-foreground">No items found</li>
                ) : (
                  items.map((item, i) => {
                    const qty = item.quantity ?? 1;
                    const line = (item.price ?? 0) * qty;
                    return (
                      <li key={`${item.slug ?? item.name}-${i}`} className="flex gap-4 py-4 first:pt-1 last:pb-1">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[13px] font-bold leading-snug text-[var(--g-charcoal)]">
                            {item.name}
                          </p>
                          {item.variantName ? (
                            <p className="mt-1 text-[11px] font-medium text-[var(--g-taupe)]">
                              {item.variantName}
                            </p>
                          ) : null}
                          <p className="mt-2 inline-flex rounded-full border border-[var(--g-line)] bg-[var(--g-cream)] px-2 py-0.5 text-[11px] font-semibold">
                            Qty: {qty}
                          </p>
                        </div>
                        <span className="shrink-0 text-[14px] font-bold tabular-nums text-[var(--g-charcoal)]">
                          {formatPrice(line)}
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>

              <div className="border-t border-[var(--g-line)] bg-[var(--g-sand,#fffaf3)] p-5">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--g-gold,#c9a227)]">
                  Order bill
                </p>
                <div className="space-y-2.5">
                  {billLines.map((line) => {
                    const amount =
                      line.free && line.amount === 0
                        ? "Free"
                        : line.amount < 0
                          ? `− ${formatPrice(Math.abs(line.amount))}`
                          : formatPrice(line.amount);
                    return (
                      <div
                        key={line.key}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-[13px] ${
                          line.key === "total"
                            ? "border-t border-[var(--g-line)] pt-3 text-base font-bold text-[var(--g-forest)]"
                            : line.tone === "deal"
                              ? "font-semibold text-[var(--g-sage)]"
                              : "text-[var(--g-charcoal)]"
                        }`}
                      >
                        <span className="min-w-0">{line.label}</span>
                        <span className="shrink-0 text-right tabular-nums">{amount}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] text-[var(--g-taupe)]">Inclusive of all taxes · Pay on delivery</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 py-8 sm:flex-row">
          {isCod && (status === "new" || status === "processing") && config.whatsappConfirmFlow && config.whatsappNumber ? (
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded border border-[#25D366] bg-[#25D366] px-10 text-[14px] font-bold tracking-wide text-white shadow-sm hover:bg-[#25D366]/90 sm:w-auto"
            >
              <a
                href={`https://wa.me/${config.whatsappNumber.replace(
                  /\D/g,
                  ""
                )}?text=${encodeURIComponent(
                  `Hello Buy n Try! I want to confirm my order #${orderId}. Total: ${formatPrice(order.total ?? 0)}. Name: ${customer?.name || "Customer"}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 h-5 w-5" /> Confirm via WhatsApp
              </a>
            </Button>
          ) : null}
          <Button
            asChild
            size="lg"
            className="h-12 w-full rounded border border-[var(--g-forest)] bg-[var(--g-forest)] px-10 text-[14px] font-bold tracking-wide text-[var(--g-white)] shadow-sm hover:bg-[var(--g-forest)]/90 sm:w-auto"
          >
            <Link href="/track">
              <Package className="mr-2 h-4 w-4" /> Track your order
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 w-full rounded border-[var(--g-line)] bg-[var(--g-white)] px-10 text-[14px] font-bold tracking-wide text-[var(--g-charcoal)] shadow-sm hover:bg-[var(--g-cream)] sm:w-auto"
          >
            <Link href="/products">
              <ShoppingBag className="mr-2 h-4 w-4 text-[var(--g-taupe)]" /> Continue shopping
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-center gap-5 pt-2 text-[13px] font-semibold text-[var(--g-forest)]">
          <Link
            href={`/order/${orderId}/invoice?email=${encodeURIComponent(email)}&print=1`}
            target="_blank"
            className="flex items-center gap-1.5 underline-offset-4 hover:underline"
          >
            <ClipboardList className="h-4 w-4" /> Download invoice
          </Link>
          <span className="h-3 w-px bg-[var(--g-line)]" />
          <Link
            href="/contact"
            className="flex items-center gap-1.5 text-[var(--g-taupe)] underline-offset-4 hover:underline"
          >
            <Headphones className="h-4 w-4" /> Need help?
          </Link>
        </div>

        <div className="mt-12 grid w-full grid-cols-1 gap-6 divide-y divide-[var(--g-line)] rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-4 shadow-sm sm:p-6 md:mt-20 md:grid-cols-3 md:divide-x md:divide-y-0 lg:mt-20">
          <SupportCard
            icon={<Headphones className="h-5 w-5" />}
            title="Need help?"
            body="We’re here to help you with any questions."
            href="/contact"
            cta="Contact support"
          />
          <SupportCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Easy returns"
            body="7 days easy returns and 1 year warranty on all products."
            href="/warranty"
            cta="Learn more"
          />
          <SupportCard
            icon={<Package className="h-5 w-5" />}
            title="Track anytime"
            body="Use your order number and email to see live status."
            href="/track"
            cta="Track order"
          />
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--g-forest)]/10 bg-[var(--g-forest)]/5 text-[var(--g-forest)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">{label}</p>
        <p
          className={`mt-1 break-words text-[13px] font-bold ${
            accent ? "text-[var(--g-forest)]" : "text-[var(--g-charcoal)]"
          }`}
        >
          {value || "—"}
        </p>
        {hint ? <p className="mt-1 text-[12px] leading-snug text-[var(--g-taupe)]">{hint}</p> : null}
      </div>
    </div>
  );
}

function SupportCard({
  icon,
  title,
  body,
  href,
  cta,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex gap-5 p-2 pb-6 md:p-4 md:pb-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--g-line)] bg-[var(--g-cream)] text-[var(--g-forest)]">
        {icon}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-[14px] font-bold text-[var(--g-charcoal)]">{title}</p>
        <p className="mb-3 mt-1 max-w-[220px] text-[12px] leading-relaxed text-[var(--g-taupe)]">{body}</p>
        <Link
          href={href}
          className="flex items-center text-[12.5px] font-bold text-[var(--g-forest)] hover:underline"
        >
          {cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
