import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Banknote, Calendar, Check, ClipboardList, Headphones, Home, Mail, MapPin, Package, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { getOrderByPublicId } from "@/lib/db/store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default async function OrderSuccessPage({ params }: { params: { id: string } }) {
  const order = await getOrderByPublicId(params.id);
  if (!order) {
    return notFound();
  }

  const { customer, items, total, orderId, createdAt } = order;
  const isCod = order.payment === "cod";

  return (
    <div className="min-h-screen bg-[var(--g-cream)] pt-8 pb-16 lg:pt-12 lg:pb-32 border-t border-[var(--g-line)] text-[var(--g-charcoal)] animate-premium-fade">
      <div className="container mx-auto max-w-6xl px-4 lg:px-8 space-y-6">
        
        {/* Top section: Status & Progress */}
        <div className="grid gap-6 lg:grid-cols-[1fr_560px] items-stretch animate-premium-slide">
           {/* Left: Thank You Banner */}
           <div className="rounded-2xl border border-[var(--g-line)] bg-[var(--g-cream-deep)] p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--g-forest)]">
                    <Check className="h-8 w-8 text-[var(--g-cream)] stroke-[2]" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                 <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g-sage)] mb-2">
                    Thank you
                 </p>
                 <h1 className="gadget-display text-3xl tracking-tight text-[var(--g-charcoal)] sm:text-[34px]">Order confirmed</h1>
                 <p className="mt-2 text-sm leading-relaxed text-[var(--g-taupe)] max-w-sm mx-auto sm:mx-0">
                    Your order has been placed. We’ll get it ready to ship as soon as possible.
                 </p>
              </div>
           </div>

           {/* Right: Progress Tracker */}
           <div className="rounded-2xl bg-[var(--g-white)] border border-[var(--g-line)] p-8 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow">
              <div className="w-full max-w-[420px] mx-auto grid grid-cols-4 relative text-center">
                 {/* Connecting Line */}
                 <div className="absolute left-[12.5%] right-[12.5%] top-4 h-[2px] border-t-2 border-dashed border-[var(--g-line)] -z-10" />
                 
                 <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--g-forest)] text-[var(--g-white)] flex items-center justify-center outline outline-[4px] outline-[var(--g-white)] shadow-sm shrink-0 relative animate-in pop-in duration-500">
                       <Check className="w-4 h-4 stroke-[3]" />
                       <div className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[var(--g-white)] animate-pulse" />
                    </div>
                    <div className="mt-1">
                       <p className="text-xs font-bold text-[var(--g-charcoal)]">Confirmed</p>
                       <p className="text-[10px] font-semibold text-[var(--g-forest)] mt-1">{new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                 </div>

                 <div className="flex flex-col items-center gap-3 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                    <div className="w-8 h-8 rounded-full bg-[var(--g-cream)] text-[var(--g-taupe)] flex items-center justify-center outline outline-[3px] outline-[var(--g-white)] border border-[var(--g-line)] shadow-sm shrink-0">
                       <Package className="w-4 h-4" />
                    </div>
                    <div className="mt-1">
                       <p className="text-xs font-bold text-[var(--g-taupe)]">Processing</p>
                       <p className="text-[10px] font-medium mt-1 leading-tight text-[var(--g-taupe)]/80">We’re preparing<br/>your order</p>
                    </div>
                 </div>

                 <div className="flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-opacity cursor-default">
                    <div className="w-8 h-8 rounded-full bg-[var(--g-cream)] text-[var(--g-taupe)] flex items-center justify-center outline outline-[3px] outline-[var(--g-white)] border border-[var(--g-line)] shadow-sm shrink-0">
                       <Truck className="w-4 h-4" />
                    </div>
                    <div className="mt-1">
                       <p className="text-xs font-bold text-[var(--g-taupe)]">Shipped</p>
                       <p className="text-[10px] font-medium mt-1 leading-tight text-[var(--g-taupe)]/80">On the way to<br/>you</p>
                    </div>
                 </div>

                 <div className="flex flex-col items-center gap-3 opacity-30 hover:opacity-100 transition-opacity cursor-default">
                    <div className="w-8 h-8 rounded-full bg-[var(--g-cream)] text-[var(--g-taupe)] flex items-center justify-center outline outline-[3px] outline-[var(--g-white)] border border-[var(--g-line)] shadow-sm shrink-0">
                       <Home className="w-4 h-4" />
                    </div>
                    <div className="mt-1">
                       <p className="text-xs font-bold text-[var(--g-taupe)]">Delivered</p>
                       <p className="text-[10px] font-medium mt-1 leading-tight text-[var(--g-taupe)]/80">Get ready to<br/>enjoy!</p>
                    </div>
                 </div>

              </div>
           </div>
        </div>

        {/* Middle section: Details & Items Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_450px]">
           {/* Order Details */}
           <div className="rounded-2xl bg-[var(--g-white)] border border-[var(--g-line)] shadow-sm overflow-hidden flex flex-col relative transition-all hover:shadow-md">
              <div className="border-b border-[var(--g-line)] p-5 flex items-center gap-3 bg-[var(--g-cream)]/50">
                 <ClipboardList className="w-5 h-5 text-[var(--g-forest)]" strokeWidth={2.5}/>
                 <h3 className="font-bold text-[15px] text-[var(--g-charcoal)]">Order Details</h3>
              </div>
              <div className="p-6 grid gap-y-7 gap-x-6 sm:grid-cols-2">
                 <div className="flex gap-4 items-start group">
                    <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 font-bold tracking-tight transition-transform group-hover:scale-110">#</div>
                    <div className="mt-0.5">
                       <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Order Number</p>
                       <p className="text-[14px] font-bold text-[var(--g-forest)] mt-1 tracking-tight">{orderId}</p>
                    </div>
                 </div>
                 <div className="flex gap-4 items-start group">
                    <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 transition-transform group-hover:scale-110"><Mail className="w-4 h-4"/></div>
                    <div className="mt-0.5">
                       <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Confirmation Email</p>
                       <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-[13px] font-bold text-[var(--g-charcoal)] truncate max-w-[150px] sm:max-w-none">{customer?.email || 'customer@example.com'}</p>
                          <span className="text-[9px] font-bold bg-[var(--g-forest)]/10 text-[var(--g-forest)] px-1.5 py-0.5 rounded uppercase tracking-wider border border-[var(--g-forest)]/20 animate-pulse">Sent</span>
                       </div>
                       <p className="text-[11px] text-[var(--g-taupe)] mt-1">A confirmation has been sent.</p>
                    </div>
                 </div>
                 <div className="flex gap-4 items-start group">
                    <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 transition-transform group-hover:scale-110"><Calendar className="w-4 h-4"/></div>
                    <div className="mt-0.5">
                       <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Order Date</p>
                       <p className="text-[13px] font-bold text-[var(--g-charcoal)] mt-1">{new Date(createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} &bull; {new Date(createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric'})}</p>
                    </div>
                 </div>
                 <div className="flex gap-4 items-start group">
                    <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 transition-transform group-hover:scale-110"><Truck className="w-4 h-4"/></div>
                    <div className="mt-0.5">
                       <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Estimated Delivery</p>
                       <p className="text-[13px] font-bold text-[var(--g-charcoal)] mt-1">
                          {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} &ndash; {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                       </p>
                       <p className="text-[11px] font-medium text-[var(--g-taupe)] mt-1">(2–4 Working Days)</p>
                    </div>
                 </div>
                 <div className="flex gap-4 items-start group">
                    <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 transition-transform group-hover:scale-110"><Banknote className="w-4 h-4"/></div>
                    <div className="mt-0.5">
                       <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Payment Method</p>
                       <p className="text-[13px] font-bold text-[var(--g-charcoal)] mt-1">{isCod ? 'Cash on Delivery (COD)' : 'Prepaid'}</p>
                    </div>
                 </div>
                 <div className="flex gap-4 items-start group">
                    <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 transition-transform group-hover:scale-110"><MapPin className="w-4 h-4"/></div>
                    <div className="mt-0.5">
                       <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Shipping Address</p>
                       <p className="text-[13px] font-bold text-[var(--g-charcoal)] mt-1 capitalize">{customer?.name || ''}</p>
                       <p className="text-[12px] text-[var(--g-taupe)] mt-1 leading-snug">
                          {customer?.address || ''}<br/>
                          {customer?.city ? `${customer.city}, ` : ''}Pakistan
                       </p>
                    </div>
                 </div>
                 <div className="flex gap-4 sm:col-span-2 pt-6 border-t border-[var(--g-line)] items-start group">
                    <div className="w-8 h-8 rounded-full bg-[var(--g-forest)]/5 border border-[var(--g-forest)]/10 flex items-center justify-center text-[var(--g-forest)] shrink-0 transition-transform group-hover:scale-110"><ShoppingBag className="w-4 h-4"/></div>
                    <div className="mt-0.5">
                       <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--g-taupe)]">Total Amount</p>
                       <p className="text-[20px] font-black text-[var(--g-forest)] mt-1 tabular-nums">{formatPrice(total ?? 0)}</p>
                       <p className="text-[11px] font-medium text-[var(--g-taupe)] mt-1">(Inclusive of all taxes)</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Items Box Sidebar */}
           <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-[var(--g-white)] border border-[var(--g-line)] shadow-sm overflow-hidden flex flex-col flex-1 relative hover:shadow-md transition-shadow">
                 <div className="border-b border-[var(--g-line)] p-5 flex items-center justify-between bg-[var(--g-cream)]/50">
                    <div className="flex items-center gap-3">
                       <ClipboardList className="w-5 h-5 text-[var(--g-forest)]" strokeWidth={2.5} />
                       <h3 className="font-bold text-[14px] text-[var(--g-charcoal)]">Items in Your Order ({(items ?? []).length})</h3>
                    </div>
                 </div>
                 <ul className="divide-y divide-[var(--g-line)] p-5 flex-1 max-h-[360px] overflow-y-auto custom-scrollbar">
                    {!(items && items.length > 0) ? (
                       <div className="text-center py-8 flex flex-col items-center justify-center">
                          <span className="text-sm text-muted-foreground font-medium">No items found</span>
                       </div>
                    ) : (
                       items.map((item, i) => (
                          <li key={i} className="py-5 flex gap-4 first:pt-2 last:pb-1 group/item">
                             <div className="flex flex-1 flex-col justify-center">
                                <div className="flex items-start justify-between gap-4 w-full">
                                   <div className="flex-1">
                                      <p className="text-[13px] font-bold text-[var(--g-charcoal)] line-clamp-2 leading-relaxed tracking-tight group-hover/item:text-[var(--g-forest)] transition-colors">{item.name}</p>
                                      {item.variantName ? (
                                         <p className="text-[11.5px] font-medium text-[var(--g-taupe)] mt-1.5">{item.variantName}</p>
                                      ) : null}
                                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--g-cream)] border border-[var(--g-line)] mt-2">
                                         <span className="text-[11px] font-semibold text-[var(--g-charcoal)]">Qty: {item.quantity}</span>
                                      </div>
                                   </div>
                                   <span className="text-[14px] font-bold text-[var(--g-charcoal)] tabular-nums shrink-0">{formatPrice(item.price ?? 0)}</span>
                                </div>
                             </div>
                          </li>
                       ))
                    )}
                 </ul>
              </div>
           </div>
        </div>

        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-8 animate-premium-fade">
           <Button asChild size="lg" className="h-12 px-10 text-[14px] font-bold tracking-wide w-full sm:w-auto shadow-sm bg-[var(--g-forest)] hover:bg-[var(--g-forest)]/90 text-[var(--g-white)] rounded border border-[var(--g-forest)] transition-transform hover:-translate-y-0.5">
              <Link href="/track">
                 <Package className="w-4 h-4 mr-2" /> Track Your Order
              </Link>
           </Button>
           <Button asChild size="lg" variant="outline" className="h-12 px-10 text-[14px] font-bold tracking-wide w-full sm:w-auto bg-[var(--g-white)] hover:bg-[var(--g-cream)] text-[var(--g-charcoal)] border-[var(--g-line)] shadow-sm rounded transition-transform hover:-translate-y-0.5">
              <Link href="/products">
                 <ShoppingBag className="w-4 h-4 mr-2 text-[var(--g-taupe)]" /> Continue Shopping
              </Link>
           </Button>
        </div>
        
        <div className="flex items-center justify-center gap-5 text-[13px] font-semibold text-[var(--g-forest)] pt-2 animate-premium-fade">
           <Link href={`/order/${orderId}/invoice?print=1`} target="_blank" className="flex items-center gap-1.5 hover:underline decoration-[var(--g-forest)]/30 underline-offset-4 transition-all"><ClipboardList className="w-4 h-4"/> Download Invoice</Link>
           <span className="w-px h-3 bg-[var(--g-line)]" />
           <Link href="/contact" className="flex items-center gap-1.5 hover:underline text-[var(--g-taupe)] decoration-[var(--g-taupe)]/30 underline-offset-4 transition-all"><Headphones className="w-4 h-4"/> Need help? <span className="text-[var(--g-forest)] font-bold ml-0.5 hover:underline decoration-[var(--g-forest)]/30">Contact Support</span></Link>
        </div>

        {/* Bottom Support Callouts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 lg:mt-20 bg-[var(--g-white)] rounded-2xl border border-[var(--g-line)] shadow-sm p-4 sm:p-6 w-full divide-y md:divide-y-0 md:divide-x divide-[var(--g-line)] animate-premium-slide">
           <div className="flex gap-5 p-2 md:p-4 pb-6 md:pb-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-[var(--g-cream)] text-[var(--g-forest)] flex items-center justify-center shrink-0 border border-[var(--g-line)] transition-transform group-hover:scale-110 group-hover:bg-[var(--g-forest)] group-hover:text-[var(--g-white)]">
                 <Headphones className="w-5 h-5"/>
              </div>
              <div className="pt-0.5">
                 <p className="text-[14px] font-bold text-[var(--g-charcoal)]">Need help?</p>
                 <p className="text-[12px] text-[var(--g-taupe)] mt-1 mb-3 leading-relaxed max-w-[220px]">We’re here to help you with any questions.</p>
                 <Link href="/contact" className="text-[12.5px] font-bold text-[var(--g-forest)] flex items-center hover:underline transition-colors">Contact Support <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" /></Link>
              </div>
           </div>
           <div className="flex gap-5 p-2 md:p-4 py-6 md:py-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-[var(--g-cream)] text-[var(--g-forest)] flex items-center justify-center shrink-0 border border-[var(--g-line)] transition-transform group-hover:scale-110 group-hover:bg-[var(--g-forest)] group-hover:text-[var(--g-white)]">
                 <ShieldCheck className="w-5 h-5"/>
              </div>
              <div className="pt-0.5">
                 <p className="text-[14px] font-bold text-[var(--g-charcoal)]">Easy Returns</p>
                 <p className="text-[12px] text-[var(--g-taupe)] mt-1 mb-3 leading-relaxed max-w-[220px]">7 days easy returns and 1 year warranty on all products.</p>
                 <Link href="/warranty" className="text-[12.5px] font-bold text-[var(--g-forest)] flex items-center hover:underline transition-colors">Learn More <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" /></Link>
              </div>
           </div>
           <div className="flex gap-5 p-2 md:p-4 pt-6 md:pt-4 group cursor-pointer mb-2">
              <div className="w-12 h-12 rounded-full bg-[var(--g-cream)] text-[var(--g-charcoal)] flex items-center justify-center shrink-0 border border-[var(--g-line)] transition-all group-hover:scale-110 group-hover:bg-[#25D366] group-hover:text-white group-hover:border-[#25D366]">
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              </div>
              <div className="pt-0.5">
                 <p className="text-[14px] font-bold text-[var(--g-charcoal)]">Chat with us on WhatsApp</p>
                 <p className="text-[12px] text-[var(--g-taupe)] mt-1 mb-3 leading-relaxed max-w-[220px]">Get quick support on WhatsApp during business hours.</p>
                 <Link href="https://wa.me/92300000000" className="text-[12.5px] font-bold text-[var(--g-charcoal)] group-hover:text-[#25D366] flex items-center hover:underline transition-colors">Chat Now <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" /></Link>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
