import { ShieldCheck, Zap, MonitorSmartphone, Lock } from "lucide-react";

export function TrustBar() {
  const items = [
    {
      icon: Zap,
      label: "Fast Charging",
      sub: "Up to 100W",
    },
    {
      icon: MonitorSmartphone,
      label: "Universal Compatibility",
      sub: "Works with all devices",
    },
    {
      icon: ShieldCheck,
      label: "Premium Quality",
      sub: "Built to last",
    },
    {
      icon: Lock,
      label: "Secure Payments",
      sub: "100% Safe Checkout",
    },
  ];

  return (
    <section className="container mx-auto max-w-screen-xl px-4 md:px-6 lg:px-8 -mt-6 relative z-30">
      <div className="bg-white rounded-2xl shadow-md border border-border/30 p-2 sm:p-4 lg:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 sm:divide-x divide-border/40">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center sm:flex-row sm:items-start gap-4 px-2 sm:px-4 py-2"
            >
              <div className="bg-primary/5 rounded-full p-3 sm:p-4 shrink-0">
                <item.icon
                  className="h-6 w-6 text-primary"
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
              <div className="text-center sm:text-left pt-1">
                <p className="text-[15px] font-bold text-foreground leading-tight">
                  {item.label}
                </p>
                <p className="text-[13px] text-muted-foreground mt-1">
                  {item.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
