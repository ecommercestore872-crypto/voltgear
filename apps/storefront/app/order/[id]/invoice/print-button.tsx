"use client";

import { useEffect } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { invoiceFileTitle } from "@/lib/invoice-template-rules";

export default function PrintButton({ orderId }: { orderId: string }) {
  useEffect(() => {
    const previous = document.title;
    document.title = invoiceFileTitle(orderId);
    const auto = window.location.search.includes("print=1");
    const timer = auto
      ? window.setTimeout(() => {
          window.print();
        }, 400)
      : 0;
    return () => {
      document.title = previous;
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId]);

  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="bg-[var(--g-forest)] text-[var(--g-cream)] hover:bg-[var(--g-forest)]/90"
    >
      <Download className="mr-2 h-4 w-4" />
      Download PDF
    </Button>
  );
}
