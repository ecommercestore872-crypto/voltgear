"use client";

import Link from "next/link";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { GadgetProductCard } from "@/components/gadget/gadget-product-card";
import { TrustBar } from "@/components/sections/trust-bar";
import type { Product } from "@/lib/types";
import { 
  Heart, 
  Percent, 

  Link2, 
  MessageCircle, 
  LayoutGrid, 
  List,
  ChevronDown
} from "lucide-react";

export function WishlistClient({ products }: { products: Product[] }) {
  const { items: wishlistItems } = useWishlist();
  
  // Get full product objects for the items in the wishlist
  const savedProducts = wishlistItems.map(item => 
    products.find(p => p.slug === item.slug)
  ).filter(Boolean) as Product[];

  // Fallback products for the "You may also like" section
  const recommended = products
    .filter(p => !wishlistItems.some(item => item.slug === p.slug))
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-[#F8FAFC] border-t border-border/40 pb-16">
      <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-8 md:py-12 space-y-8">
        
        {/* Breadcrumbs */}
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#0D2F35]">Wishlist</span>
        </div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-[32px] md:text-[38px] font-extrabold text-[#0D2F35] tracking-tight leading-none mb-2">
              My Wishlist
            </h1>
            <p className="text-[15px] font-medium text-muted-foreground">
              Saved items you can review anytime.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#E8F8F5] px-4 py-2 rounded-lg border border-[#13A387]/20 shadow-sm shrink-0">
            <Heart className="w-4 h-4 text-[#13A387] fill-[#13A387]" />
            <span className="text-[13px] font-bold text-[#13A387]">{savedProducts.length} saved items</span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-white p-3 rounded-2xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.015)]">
          {/* Left: Filters */}
          <div className="flex w-full md:w-auto items-center gap-1 overflow-x-auto no-scrollbar">
            <button className="px-4 py-1.5 rounded-xl bg-[#E8F8F5]/80 text-[#13A387] text-[13px] font-extrabold whitespace-nowrap transition-colors">
              All Items ({savedProducts.length})
            </button>
            <button className="px-4 py-1.5 rounded-xl text-muted-foreground hover:bg-slate-50 hover:text-[#0D2F35] text-[13px] font-bold whitespace-nowrap transition-colors">
              In Stock ({savedProducts.filter(p => p.stockStatus !== "out-of-stock").length})
            </button>
            <button className="px-4 py-1.5 rounded-xl text-muted-foreground hover:bg-slate-50 hover:text-[#0D2F35] text-[13px] font-bold whitespace-nowrap transition-colors">
              Price Drop (1)
            </button>
            <button className="px-4 py-1.5 rounded-xl text-muted-foreground hover:bg-slate-50 hover:text-[#0D2F35] text-[13px] font-bold whitespace-nowrap transition-colors">
              Recently Added
            </button>
          </div>

          {/* Right: Controls */}
          <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-border">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-muted-foreground">Sort by:</span>
              <button className="flex items-center gap-2 text-[13px] font-bold text-[#0D2F35] bg-white border border-border px-3 py-1.5 rounded-xl outline-none hover:bg-slate-50 transition-colors shadow-sm">
                Recently Added <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center p-1 bg-slate-50 border border-border rounded-xl">
              <button className="p-1.5 bg-white text-[#13A387] rounded-lg shadow-sm border border-border/50">
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-muted-foreground hover:text-[#0D2F35] transition-colors rounded-lg">
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Product Grid & Injected Cards */}
        <div className="gadget-product-grid">
          {savedProducts.length === 0 ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-white rounded-[22px] border border-border shadow-[0_2px_12px_rgba(0,0,0,0.015)]">
               <Heart className="w-12 h-12 text-border mb-4" />
               <h3 className="text-xl font-bold text-[#0D2F35]">Your wishlist is empty</h3>
               <p className="text-muted-foreground mt-2 font-medium">Explore our catalog and save your favorite items here.</p>
               <Link href="/products" className="mt-6 px-8 py-3 bg-[#0D2F35] text-white font-bold rounded-xl hover:bg-[#0D2F35]/90 transition-colors shadow-sm">
                 Browse Products
               </Link>
            </div>
          ) : (
            <>
              {savedProducts.slice(0, 3).map(p => (
                <div key={p.slug} className="h-full">
                  <GadgetProductCard product={p} />
                </div>
              ))}
              
              {/* Info Card 1: Price Drop Alerts */}
              {(savedProducts.length >= 1 || true) && (
                <div className="bg-white rounded-[22px] border border-border shadow-[0_2px_12px_rgba(0,0,0,0.015)] p-6 md:p-8 flex flex-col items-center justify-center text-center transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
                   <div className="w-16 h-16 rounded-full bg-[#E8F8F5] mb-5 flex items-center justify-center border border-[#13A387]/10 shadow-[inset_0_2px_6px_rgba(19,163,135,0.15)] relative">
                      <Percent className="w-7 h-7 text-[#13A387]" strokeWidth={2.5} />
                      <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                   </div>
                   <h3 className="text-[17px] font-extrabold text-[#0D2F35] mb-2 leading-tight tracking-tight">Price-drop alerts enabled</h3>
                   <p className="text-[13px] font-medium text-muted-foreground leading-relaxed balance mb-6 max-w-[220px]">
                     We&apos;ll notify you when the price drops on items in your wishlist.
                   </p>
                   <button className="w-full py-2.5 rounded-xl border border-border font-bold text-[13px] text-[#0D2F35] hover:bg-slate-50 transition-colors shadow-sm">
                     Manage Alerts
                   </button>
                </div>
              )}

              {savedProducts.slice(3, 7).map(p => (
                 <div key={p.slug} className="h-full">
                   <GadgetProductCard product={p} />
                 </div>
              ))}

              {/* Info Card 2: Share Wishlist */}
              {(savedProducts.length >= 3 || true) && (
                 <div className="bg-white rounded-[22px] border border-border shadow-[0_2px_12px_rgba(0,0,0,0.015)] p-6 md:p-8 flex flex-col items-center justify-center text-center transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
                    <h3 className="text-[17px] font-extrabold text-[#0D2F35] mb-2 leading-tight tracking-tight mt-2">Share your wishlist</h3>
                    <p className="text-[13px] font-medium text-muted-foreground leading-relaxed balance mb-6 max-w-[220px]">
                      Give friends hints or inspire someone special.
                    </p>
                    
                    <div className="flex items-center gap-3 mb-6">
                       <button className="w-9 h-9 rounded-full bg-[#E8F8F5] text-[#13A387] flex items-center justify-center hover:bg-[#13A387] hover:text-white transition-colors shadow-sm">
                         <MessageCircle className="w-4 h-4" />
                       </button>
                       <button className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors shadow-sm">
                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                       </button>
                       <button className="w-9 h-9 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-colors shadow-sm">
                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                       </button>
                       <button className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-600 hover:text-white transition-colors shadow-sm border border-border">
                         <Link2 className="w-4 h-4" />
                       </button>
                    </div>

                    <button className="w-full py-2.5 rounded-xl border border-[#13A387] font-bold text-[13px] text-[#13A387] hover:bg-[#E8F8F5] transition-colors shadow-sm">
                      Copy Wishlist Link
                    </button>
                 </div>
              )}

              {savedProducts.slice(7).map(p => (
                 <div key={p.slug} className="h-full">
                   <GadgetProductCard product={p} />
                 </div>
              ))}
            </>
          )}
        </div>

        {/* You may also like */}
        {recommended.length > 0 && (
          <div className="pt-12 mt-12 border-t border-border/60">
             <h2 className="text-2xl font-extrabold text-[#0D2F35] tracking-tight mb-8">You may also like</h2>
             <div className="gadget-product-grid">
                {recommended.map(p => (
                   <div key={p.slug} className="h-full">
                     <GadgetProductCard product={p} />
                   </div>
                ))}
             </div>
          </div>
        )}
      </div>

      <div className="border-t border-border/40 bg-white mt-12 bg-gradient-to-b from-white to-[#F8FAFC]">
         <TrustBar />
      </div>
    </div>
  );
}
