"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrintButton() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    // Auto trigger print dialogue if ?print=1 is present
    if (window.location.search.includes("print=1")) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isClient) return null;

  return (
    <Button 
      onClick={() => window.print()}
      className="bg-[var(--g-forest)] hover:bg-[var(--g-forest)]/90 text-white shadow-sm font-bold tracking-wide transition-transform hover:-translate-y-0.5"
    >
      <Printer className="w-4 h-4 mr-2" />
      Print / Save PDF
    </Button>
  );
}
