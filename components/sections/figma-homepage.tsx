import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MoreHorizontal, Percent } from "lucide-react";
import { imageUrl } from "@/lib/sanity/image";
import { getFallbackProductImage } from "@/lib/fallback-images";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/types";

export function ShopByDevice() {
  const devices = [
    { name: "iPhone", href: "/search?q=iPhone" },
    { name: "Samsung Galaxy", href: "/search?q=Samsung" },
    { name: "MacBook", href: "/search?q=MacBook" },
    { name: "iPad", href: "/search?q=iPad" },
    { name: "Windows Laptop", href: "/search?q=Laptop" },
    { name: "Gaming Devices", href: "/search?q=Gaming" },
  ];

  return (
    <section className="container mx-auto max-w-screen-xl px-4 md:px-6 lg:px-8 my-16 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Shop by Device
        </h2>
        <Link
          href="/search"
          className="text-sm font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
        >
          View all devices <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="flex overflow-x-auto pb-4 gap-4 sm:gap-6 custom-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
        {devices.map((device, i) => (
          <Link
            key={i}
            href={device.href}
            className="snap-start flex-shrink-0 group"
          >
            <div className="w-[105px] sm:w-[125px] flex flex-col items-center gap-3">
              <div className="w-full aspect-square rounded-[22px] bg-[#F5F5F7] flex flex-col items-center justify-center p-4 transition-all duration-300 group-hover:scale-[1.03] shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02]">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                  {/* Fallback abstract tech dot representing device category */}
                  <div className="w-4 h-4 bg-gradient-to-tr from-[#A1A1A6] to-[#E5E5EA] rounded-full" />
                </div>
              </div>
              <span className="text-[12.5px] sm:text-[13px] font-semibold text-[#1D1D1F] text-center leading-tight tracking-tight">
                {device.name}
              </span>
            </div>
          </Link>
        ))}
        <Link href="/search" className="snap-start flex-shrink-0 group">
          <div className="w-[105px] sm:w-[125px] flex flex-col items-center gap-3">
            <div className="w-full aspect-square rounded-[22px] bg-white border border-[#E5E5EA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-center p-4 transition-all duration-300 group-hover:scale-[1.03]">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                <MoreHorizontal className="w-5 h-5 text-[#86868B]" />
              </div>
            </div>
            <span className="text-[12.5px] sm:text-[13px] font-medium text-[#86868B] text-center leading-tight tracking-tight">
              More Devices
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}

export function FigmaPopularCategories({
  shopTypes,
  products,
}: {
  shopTypes: { slug: string; name: string }[];
  products: Product[];
}) {
  return (
    <section className="container mx-auto max-w-screen-xl px-4 md:px-6 lg:px-8 my-16 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Popular Categories
        </h2>
        <Link
          href="/products"
          className="text-sm font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
        >
          View all categories <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="flex overflow-x-auto pb-4 gap-4 sm:gap-6 custom-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
        {shopTypes.map((cat, i) => {
          const repProd = products.find(
            (p) =>
              p.category === cat.slug &&
              (p.images?.[0] || p.cloudinaryImages?.[0]),
          );
          const img = repProd?.images?.[0] || repProd?.cloudinaryImages?.[0];
          let resolvedSrc = img ? imageUrl(img, { w: 200 }) : "";
          if (!resolvedSrc) {
            resolvedSrc = getFallbackProductImage({
              category: cat.slug,
            } as unknown as Product);
          }

          return (
            <Link
              key={i}
              href={`/products/${cat.slug}`}
              className="snap-start flex-shrink-0 group"
            >
              <div className="w-[105px] sm:w-[125px] flex flex-col items-center gap-3">
                <div className="relative w-full aspect-square rounded-[22px] bg-[#F5F5F7] flex items-center justify-center p-4 transition-all duration-300 group-hover:scale-[1.03] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02),0_2px_8px_rgba(0,0,0,0.02)]">
                  {resolvedSrc ? (
                    <div className="relative w-full h-full">
                      {/* using object-contain to show real product photography inside the tile */}
                      <Image
                        src={resolvedSrc}
                        alt={cat.name}
                        fill
                        sizes="120px"
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-[#E5E5EA] rounded-xl" />
                  )}
                </div>
                <span className="text-[12.5px] sm:text-[13px] font-semibold text-[#1D1D1F] text-center leading-tight tracking-tight">
                  {cat.name}
                </span>
              </div>
            </Link>
          );
        })}
        <Link
          href="/products?tag=deals"
          className="snap-start flex-shrink-0 group"
        >
          <div className="w-[105px] sm:w-[125px] flex flex-col items-center gap-3">
            <div className="w-full aspect-square rounded-[22px] bg-[#F4F9F8] flex items-center justify-center p-4 transition-all duration-300 group-hover:scale-[1.03] shadow-[inset_0_0_0_1px_rgba(19,163,135,0.1),0_2px_8px_rgba(0,0,0,0.02)]">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-[#13A387]">
                <Percent className="w-5 h-5" strokeWidth={2.5} />
              </div>
            </div>
            <span className="text-[12.5px] sm:text-[13px] font-bold text-[#13A387] text-center leading-tight tracking-tight">
              Deals
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}

export function BestSellersSlider({ products }: { products: Product[] }) {
  if (!products?.length) return null;
  const bestSellers = products.slice(0, 5);
  return (
    <section className="container mx-auto max-w-screen-xl px-4 md:px-6 lg:px-8 my-16 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Best Sellers
        </h2>
        <Link
          href="/products"
          className="text-sm font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
        >
          View all best sellers <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="flex overflow-x-auto pb-6 gap-6 custom-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
        {bestSellers.map((p) => (
          <div
            key={p._id}
            className="snap-start flex-shrink-0 w-[240px] sm:w-[280px]"
          >
            <div className="relative h-full">
              <ProductCard
                product={{ ...p, badge: p.badge || "Best Seller" }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { ShieldCheck, Zap, HeadphonesIcon, Heart } from "lucide-react";

export function WhyChooseVoltGear() {
  const reasons = [
    {
      icon: ShieldCheck,
      title: "Curated Catalog",
      desc: "Reliable, high-quality accessories.",
    },
    {
      icon: Zap,
      title: "Performance Tested",
      desc: "Built to meet strict standards.",
    },
    {
      icon: HeadphonesIcon,
      title: "Always Support",
      desc: "We're here when you need us.",
    },
    { icon: Heart, title: "Trusted Everyday", desc: "Loved across Pakistan." },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {reasons.map((r, i) => (
          <div
            key={i}
            className="flex flex-col items-start bg-white rounded-[16px] border border-emerald-900/5 shadow-[0_2px_12px_rgba(0,0,0,0.015)] p-5 md:p-6 transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] hover:border-emerald-900/10"
          >
            <div className="w-[46px] h-[46px] shrink-0 rounded-[14px] bg-emerald-50/80 border border-emerald-100 flex items-center justify-center text-teal-700 mb-5">
              <r.icon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <h4 className="text-[15px] font-extrabold text-slate-900 leading-tight tracking-tight">
              {r.title}
            </h4>
            <p className="text-[13px] text-slate-500 font-medium mt-1.5 leading-relaxed">
              {r.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
