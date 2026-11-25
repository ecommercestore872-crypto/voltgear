import { ORDER_STATUS_VALUES } from "@/lib/db/order-rules";

const STATUS_LABEL: Record<string, string> = {
  new: "To confirm",
  processing: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: "bg-amber-100 text-amber-900 ring-1 ring-amber-500/50",
    processing: "bg-blue-100 text-blue-900 ring-1 ring-blue-500/40",
    shipped: "bg-gradient-to-r from-[#1F3626]/10 to-emerald-500/10 text-[#1F3626] dark:text-emerald-300 ring-1 ring-[#1F3626]/30",
    delivered: "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30",
    cancelled: "bg-gradient-to-r from-rose-500/10 to-red-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm ${
        styles[status] ?? "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
