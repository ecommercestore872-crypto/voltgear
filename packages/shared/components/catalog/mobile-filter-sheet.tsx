"use client";

import type { ReactNode } from "react";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileFilterSheet({
  basePath,
  children,
  triggerLabel = "Filters",
}: {
  basePath: string;
  children: ReactNode;
  triggerLabel?: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 lg:hidden">
          <Filter className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-5">{children}</div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 w-full"
          onClick={() => (window.location.href = basePath)}
        >
          Reset all filters
        </Button>
      </SheetContent>
    </Sheet>
  );
}
