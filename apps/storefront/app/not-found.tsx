import Link from "next/link";
import { SearchX, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-24 h-24 rounded-[28px] bg-primary/10 border border-primary/20 flex items-center justify-center mb-8 shadow-sm">
        <SearchX className="h-10 w-10 text-primary" strokeWidth={2.5} />
      </div>

      <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-2">
        404
      </h1>
      <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-4">
        Page Not Found
      </h2>

      <p className="max-w-md text-[15px] font-medium text-slate-500 leading-relaxed mx-auto">
        The page you are looking for might have been removed, had its name
        changed, or is temporarily unavailable.
      </p>

      <Button
        asChild
        className="mt-10 h-12 rounded-xl px-8 font-bold text-[15px] tracking-wide shadow-sm hover:shadow-md transition-all group"
      >
        <Link href="/">
          Return to Hub
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Button>
    </div>
  );
}
