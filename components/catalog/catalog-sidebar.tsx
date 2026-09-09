"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Search, Star } from "lucide-react";
import { buildCatalogUrl } from "@/lib/catalog";

// Mock config for Figma demonstration
const CATEGORIES = [
  { label: "All Products", count: 168, href: "/products", isAll: true },
  { label: "Smartwatches", count: 26, href: "/products/smartwatches" },
  { label: "Power Banks", count: 24, href: "/products/power-banks" },
  { label: "Chargers & Adapters", count: 34, href: "/products/chargers" },
  { label: "Earbuds & Handsfree", count: 28, href: "/products/audio" },
];

const BRANDS = [
  { label: "Anker", count: 28 },
  { label: "Baseus", count: 24 },
  { label: "Ugreen", count: 20 },
  { label: "Belkin", count: 16 },
  { label: "Spigen", count: 14 },
];

const DEVICES = [
  { label: "iPhone", count: 48 },
  { label: "Samsung Galaxy", count: 52 },
  { label: "Apple Watch", count: 18 },
  { label: "iPad", count: 22 },
  { label: "Windows Laptop", count: 16 },
];

const RATINGS = [
  { label: "4 & up", count: 112, stars: 4 },
  { label: "3 & up", count: 138, stars: 3 },
  { label: "2 & up", count: 152, stars: 2 },
  { label: "1 & up", count: 158, stars: 1 },
];

const PROMOTIONS = [
  { label: "On Sale", count: 26 },
  { label: "New Arrivals", count: 18 },
  { label: "Best Sellers", count: 20 },
];

function Accordion({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b py-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between font-semibold"
      >
        <span>{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

function CheckboxItem({
  label,
  count,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  count?: number;
  checked?: boolean;
  onChange?: () => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-center justify-between py-1 group"
      onClick={onChange}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "bg-primary border-primary" : "border-input group-hover:border-primary/50"}`}
        >
          {checked && (
            <svg
              className="h-3 w-3 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
        <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">
          {label}
        </span>
      </div>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </label>
  );
}

function RadioItem({
  label,
  count,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  count?: number;
  checked?: boolean;
  onChange?: () => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-center justify-between py-1 group"
      onClick={onChange}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-4 w-4 items-center justify-center rounded-full border ${checked ? "border-primary" : "border-input group-hover:border-primary/50"}`}
        >
          {checked && <div className="h-2 w-2 rounded-full bg-primary" />}
        </div>
        <span
          className={`text-sm font-medium ${checked ? "text-primary" : "text-foreground/80 group-hover:text-foreground"}`}
        >
          {label}
        </span>
      </div>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </label>
  );
}

export function CatalogSidebar({
  basePath,
  baseParams,
  availability,
  minPrice,
  maxPrice,
  categoryCount = 168, // Defaulted for mockup
}: {
  basePath: string;
  baseParams: Record<string, string>;
  availability?: string;
  minPrice?: number;
  maxPrice?: number;
  categoryCount?: number;
}) {
  const [priceRange, setPriceRange] = useState({
    min: minPrice || 1000,
    max: maxPrice || 20000,
  });
  const [brandSearch, setBrandSearch] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");

  const handlePriceApply = () => {
    const next: Record<string, string> = { ...baseParams, page: "1" };
    if (priceRange.min > 0) next.minPrice = String(priceRange.min);
    else delete next.minPrice;
    if (priceRange.max < 50000)
      next.maxPrice = String(priceRange.max); // Using 50000 as arbitrary max for slider visual
    else delete next.maxPrice;
    window.location.href = buildCatalogUrl(basePath, next, {});
  };

  const handleAvailabilityToggle = (val: string) => {
    const next: Record<string, string> = { ...baseParams, page: "1" };
    if (availability === val) delete next.availability;
    else next.availability = val;
    window.location.href = buildCatalogUrl(basePath, next, {});
  };

  const clearAll = buildCatalogUrl(basePath, {}, { page: "1" });

  return (
    <div className="w-56 shrink-0 lg:w-64">
      {/* Category Accordion */}
      <Accordion title="Category" defaultOpen>
        <div className="space-y-1">
          {CATEGORIES.map((c) => (
            <Link key={c.label} href={c.href} className="block">
              <RadioItem
                label={c.label}
                count={c.isAll ? categoryCount : c.count}
                checked={c.isAll}
              />
            </Link>
          ))}
          <button className="mt-2 text-sm font-medium text-primary hover:underline">
            View more &or;
          </button>
        </div>
      </Accordion>

      {/* Price Range Accordion */}
      <Accordion title="Price Range (PKR)" defaultOpen>
        <div className="space-y-4">
          <div className="px-2">
            <div className="relative h-1 w-full bg-muted rounded-full">
              <div
                className="absolute h-full bg-primary rounded-full min-w-[20%]"
                style={{ left: "0%", right: "0%" }}
              />
              {/* Slider thumbs visual mockup */}
              <div
                className="absolute top-1/2 -mt-1.5 -ml-1.5 h-3 w-3 rounded-full bg-primary shadow"
                style={{ left: "0%" }}
              />
              <div
                className="absolute top-1/2 -mt-1.5 -mr-1.5 h-3 w-3 rounded-full bg-primary shadow"
                style={{ right: "0%" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="w-full rounded border px-2 py-1 text-sm outline-none focus:border-primary"
              value={priceRange.min}
              onChange={(e) =>
                setPriceRange((p) => ({ ...p, min: Number(e.target.value) }))
              }
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="number"
              className="w-full rounded border px-2 py-1 text-sm outline-none focus:border-primary"
              value={priceRange.max}
              onChange={(e) =>
                setPriceRange((p) => ({ ...p, max: Number(e.target.value) }))
              }
            />
          </div>
          <button
            onClick={handlePriceApply}
            className="w-full rounded bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Apply
          </button>
        </div>
      </Accordion>

      {/* Brand Accordion */}
      <Accordion title="Brand" defaultOpen>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search brand..."
              className="w-full rounded border py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            {BRANDS.map((b) => (
              <CheckboxItem key={b.label} label={b.label} count={b.count} />
            ))}
            <button className="mt-2 text-sm font-medium text-primary hover:underline">
              View more &or;
            </button>
          </div>
        </div>
      </Accordion>

      {/* Device Compatibility Accordion */}
      <Accordion title="Device Compatibility" defaultOpen>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search device..."
              className="w-full rounded border py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
              value={deviceSearch}
              onChange={(e) => setDeviceSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            {DEVICES.map((d) => (
              <CheckboxItem key={d.label} label={d.label} count={d.count} />
            ))}
            <button className="mt-2 text-sm font-medium text-primary hover:underline">
              View more &or;
            </button>
          </div>
        </div>
      </Accordion>

      {/* Availability Accordion */}
      <Accordion title="Availability" defaultOpen>
        <div className="space-y-1">
          <CheckboxItem
            label="In Stock"
            count={156}
            checked={availability === "in-stock"}
            onChange={() => handleAvailabilityToggle("in-stock")}
          />
          <CheckboxItem label="Out of Stock" count={12} />
          <CheckboxItem label="Pre-order" count={8} />
        </div>
      </Accordion>

      {/* Rating Accordion */}
      <Accordion title="Rating" defaultOpen>
        <div className="space-y-1">
          {RATINGS.map((r) => (
            <CheckboxItem
              key={r.label}
              label={
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3 w-3 ${s <= r.stars ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
                    />
                  ))}
                  <span className="ml-1 text-xs">({r.label})</span>
                </div>
              }
              count={r.count}
            />
          ))}
        </div>
      </Accordion>

      {/* Promotions Accordion */}
      <Accordion title="Promotions" defaultOpen>
        <div className="space-y-1">
          {PROMOTIONS.map((p) => (
            <CheckboxItem key={p.label} label={p.label} count={p.count} />
          ))}
        </div>
      </Accordion>

      {/* Clear All */}
      <div className="mt-6 pt-6 border-t">
        <Link
          href={clearAll}
          className="flex items-center justify-center gap-2 w-full py-2 text-sm font-semibold text-primary hover:text-primary-hover"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-primary">
            <span className="text-xs">X</span>
          </div>
          Clear All Filters
        </Link>
      </div>
    </div>
  );
}
