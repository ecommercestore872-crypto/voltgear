import { ChevronDown, Search } from "lucide-react";

export function CompatibilityBanner() {
  return (
    <div className="container mx-auto max-w-screen-xl px-4 md:px-6 lg:px-8 my-16">
      <div className="bg-primary/5 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-primary/10">
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0 bg-white rounded-full p-4 shadow-sm border border-border/50">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">
              Not sure what&apos;s compatible with your device?
            </h3>
            <p className="text-muted-foreground mt-1">
              Let us help you find the perfect accessory.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 flex-1 justify-end max-w-xl">
          <div className="relative flex-1">
            <select className="w-full appearance-none bg-white border border-border/80 rounded-lg px-4 py-3 text-sm font-medium outline-none focus:border-primary pr-10">
              <option>Select Your Device Type</option>
              <option>Smartphone</option>
              <option>Laptop</option>
              <option>Tablet</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative flex-1">
            <select className="w-full appearance-none bg-white border border-border/80 rounded-lg px-4 py-3 text-sm font-medium outline-none focus:border-primary pr-10">
              <option>Select Your Device Model</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <button
            type="button"
            className="bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-colors"
          >
            Find My Gear
          </button>
        </div>
      </div>
    </div>
  );
}
