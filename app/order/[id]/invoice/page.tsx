import { notFound } from "next/navigation";
import { getOrderByPublicId } from "@/lib/db/store";
import { formatPrice } from "@/lib/utils";
import PrintButton from "./print-button";

export const metadata = {
  title: "Order Invoice - VoltGear",
};

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const order = await getOrderByPublicId(params.id);
  if (!order) return notFound();

  const { customer, items, total, orderId, createdAt } = order;
  const isCod = order.payment === "cod";
  const safeTotal = typeof total === "number" ? total : 0;
  const tax = Math.round(safeTotal * 0.05); // Simulated simple 5% tax from total for aesthetics, or extract actual tax if saved
  const subtotal = safeTotal - tax;

  return (
    <div className="min-h-screen bg-[var(--g-cream)]/30 p-4 md:p-8 flex justify-center text-[var(--g-charcoal)] font-sans">
      <div className="w-full max-w-[850px] bg-white shadow-xl md:rounded-lg overflow-hidden border border-[var(--g-line)] print:shadow-none print:border-none print:rounded-none">
        
        {/* Header Actions - hidden on print */}
        <div className="flex justify-between items-center p-6 border-b border-[var(--g-line)] bg-[var(--g-cream)]/50 print:hidden">
           <div>
             <h1 className="text-xl font-bold tracking-tight text-[var(--g-forest)]">Order Invoice</h1>
             <p className="text-sm text-[var(--g-taupe)] font-medium mt-1">Order #{orderId}</p>
           </div>
           <PrintButton />
        </div>

        {/* INVOICE BODY */}
        <div className="p-8 md:p-12 print:p-0" id="printable-invoice">
           
           {/* Invoice Header */}
           <div className="flex justify-between items-start border-b border-[var(--g-line)] pb-8 mb-8">
              <div>
                <div className="text-[32px] font-black tracking-tight text-[var(--g-forest)] mb-1 gadget-display leading-none">VOLTGEAR.</div>
                <p className="text-[13px] text-[var(--g-taupe)] font-medium uppercase tracking-widest mb-3">Accessories Hub</p>
                <p className="text-sm text-[var(--g-charcoal)] mt-2">123 Tech Avenue, Block 4</p>
                <p className="text-sm text-[var(--g-charcoal)] mt-0.5">Lahore, Pakistan</p>
                <p className="text-sm text-[var(--g-charcoal)] mt-0.5">support@voltgear.pk</p>
              </div>
              <div className="text-right">
                <h2 className="text-[40px] font-black uppercase text-[var(--g-charcoal)] tracking-tighter mb-4 gadget-display leading-none">INVOICE</h2>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-right">
                   <div className="text-[var(--g-taupe)] font-semibold">Invoice No:</div>
                   <div className="font-bold text-[var(--g-charcoal)] uppercase tracking-wider">{orderId}</div>
                   <div className="text-[var(--g-taupe)] font-semibold">Date:</div>
                   <div className="font-bold text-[var(--g-charcoal)]">{new Date(createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                   <div className="text-[var(--g-taupe)] font-semibold">Payment:</div>
                   <div className="font-bold text-[var(--g-forest)] uppercase tracking-wider text-xs flex items-center justify-end">{isCod ? 'Cash on Delivery' : 'Prepaid'}</div>
                </div>
              </div>
           </div>

           {/* Customer Info */}
           <div className="flex flex-col sm:flex-row justify-between gap-8 mb-10">
              <div className="bg-[var(--g-cream)] p-6 rounded-xl border border-[var(--g-line)] flex-1 print:border-none print:p-0 print:bg-transparent">
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--g-forest)] mb-3">Billed / Shipped To:</h3>
                 <p className="font-bold text-[17px] text-[var(--g-charcoal)] capitalize mb-2">{customer?.name}</p>
                 <p className="text-[14px] text-[var(--g-charcoal)] leading-relaxed max-w-[280px]">
                    {customer?.address}<br/>
                    {customer?.city ? `${customer.city}, ` : ''}Pakistan
                 </p>
                 {customer?.email && <p className="text-[13px] text-[var(--g-charcoal)]/80 mt-3 font-medium bg-white p-2 rounded border border-[var(--g-line)] inline-block print:border-none print:p-0">{customer.email}</p>}
                 {customer?.phone && <p className="text-[13px] text-[var(--g-charcoal)]/80 mt-1 font-medium bg-white p-2 rounded border border-[var(--g-line)] inline-block print:border-none print:p-0">{customer.phone}</p>}
              </div>
           </div>

           {/* Items Table */}
           <div className="mb-10 border border-[var(--g-line)] rounded-xl overflow-hidden print:border-t-2 print:border-t-black print:border-x-0 print:border-b-0 print:rounded-none">
             <table className="w-full text-left text-sm border-collapse">
               <thead className="bg-[var(--g-forest)] text-[var(--g-white)] font-bold text-[11px] uppercase tracking-wider print:bg-transparent print:border-b-2 print:text-black">
                 <tr>
                   <th className="px-6 py-4">Item Description</th>
                   <th className="px-6 py-4 text-center">Qty</th>
                   <th className="px-6 py-4 text-right">Price</th>
                   <th className="px-6 py-4 text-right">Total</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-[var(--g-line)] print:divide-gray-300">
                 {(items ?? []).map((item, idx) => (
                   <tr key={idx} className="bg-white print:bg-transparent">
                     <td className="px-6 py-5 font-bold text-[var(--g-charcoal)] print:font-semibold text-base">
                        {item.name}
                        {item.variantName && <span className="block text-xs text-[var(--g-taupe)] font-medium mt-1 uppercase tracking-wider">{item.variantName}</span>}
                     </td>
                     <td className="px-6 py-5 text-center font-semibold text-base">{item.quantity ?? 1}</td>
                     <td className="px-6 py-5 text-right font-medium text-[var(--g-taupe)]">{formatPrice(item.price ?? 0)}</td>
                     <td className="px-6 py-5 text-right font-bold text-[var(--g-charcoal)] text-[15px]">{formatPrice((item.price ?? 0) * (item.quantity ?? 1))}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           {/* Totals */}
           <div className="flex flex-col sm:flex-row justify-between items-end">
              <div className="text-xs text-[var(--g-taupe)] font-medium max-w-sm mb-6 sm:mb-0">
                 <p className="mb-1 font-bold text-[var(--g-charcoal)]">Thank you for your business!</p>
                 <p className="leading-relaxed">Returns are accepted within 7 days of delivery. Please keep this invoice safe for any future warranty claims.</p>
                 <div className="w-full h-12 mt-4 bg-[var(--g-cream)] px-4 py-2 border border-[var(--g-line)] rounded text-[11px] flex items-center print:hidden">
                    Looking for support? Visit voltgear.pk/contact
                 </div>
              </div>
              <div className="w-full sm:w-1/2 lg:w-1/3">
                 <div className="bg-[var(--g-cream)]/50 p-6 rounded-xl border border-[var(--g-line)] print:bg-transparent print:p-0 print:border-none">
                     <div className="flex justify-between text-sm mb-3">
                        <span className="text-[var(--g-taupe)] font-semibold uppercase tracking-wider text-xs">Subtotal</span>
                        <span className="font-bold">{formatPrice(subtotal)}</span>
                     </div>
                     <div className="flex justify-between text-sm mb-3 border-b border-[var(--g-line)] print:border-gray-300 pb-3">
                        <span className="text-[var(--g-taupe)] font-semibold uppercase tracking-wider text-xs">Tax (5% Incl.)</span>
                        <span className="font-bold">{formatPrice(tax)}</span>
                     </div>
                     <div className="flex justify-between pt-1">
                        <span className="text-lg font-black uppercase text-[var(--g-charcoal)] tracking-tight">Total</span>
                        <span className="text-xl font-black text-[var(--g-forest)] tabular-nums print:text-black">{formatPrice(safeTotal)}</span>
                     </div>
                 </div>
              </div>
           </div>
           
           <div className="mt-20 pt-8 border-t border-dashed border-[var(--g-line)] text-center text-[10px] text-[var(--g-taupe)] font-medium uppercase tracking-widest hidden print:block">
              This is a computer generated document and does not require a signature.
           </div>

        </div>
      </div>
    </div>
  );
}
