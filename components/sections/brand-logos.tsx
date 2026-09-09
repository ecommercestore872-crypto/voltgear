import { cn } from "@/lib/utils";

export function BrandLogos({ className }: { className?: string }) {
  const logos = [
    <span
      key="1"
      className="text-2xl font-semibold tracking-tight text-slate-800 flex-shrink-0"
    >
      Apple
    </span>,
    <span
      key="2"
      className="text-2xl font-bold tracking-wider text-slate-900 flex-shrink-0"
    >
      SAMSUNG
    </span>,
    <span key="3" className="text-2xl font-bold text-slate-800 flex-shrink-0">
      ANKER
    </span>,
    <span
      key="4"
      className="text-2xl font-black tracking-tighter text-slate-900 flex-shrink-0"
    >
      UGREEN
    </span>,
    <span
      key="5"
      className="text-2xl font-medium tracking-widest leading-none flex items-center text-slate-800 flex-shrink-0"
    >
      <span className="text-3xl mr-1 font-bold">⋮</span>belkin
    </span>,
    <span
      key="6"
      className="text-2xl font-black italic text-slate-800 flex-shrink-0"
    >
      Baseus
    </span>,
    <span
      key="7"
      className="text-2xl font-bold italic text-slate-800 flex-shrink-0"
    >
      spigen
    </span>,
  ];

  return (
    <section
      className={cn(
        "bg-white py-10 relative overflow-hidden border-b border-border/40",
        className,
      )}
    >
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      <div className="flex w-full select-none gap-16 overflow-hidden">
        {/* Double the list to create the infinite scroll effect */}
        {[0, 1].map((idx) => (
          <div
            key={idx}
            className="flex min-w-full shrink-0 animate-marquee items-center justify-around gap-16 opacity-40 grayscale transition-opacity hover:opacity-100 px-8"
          >
            {logos}
          </div>
        ))}
      </div>
    </section>
  );
}
