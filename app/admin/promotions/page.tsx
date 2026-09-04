"use client";

import React, { useState } from "react";
import {
  Tag,
  CreditCard,
  Plus,
  Building2,
  Sparkles,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BankPaymentOffer, DiscountCoupon, FlashCampaign } from "@/lib/autopilot/promotion-types";

const INITIAL_COUPONS: DiscountCoupon[] = [
  {
    id: "c1",
    code: "VOLT10",
    type: "PERCENTAGE",
    value: 10,
    minOrderAmount: 3000,
    maxUsageCount: 500,
    usageCount: 142,
    startsAt: "2026-09-01T00:00:00Z",
    expiresAt: "2026-09-30T23:59:59Z",
    isActive: true,
  },
  {
    id: "c2",
    code: "WELCOME500",
    type: "FIXED_AMOUNT",
    value: 500,
    minOrderAmount: 5000,
    maxUsageCount: 200,
    usageCount: 89,
    startsAt: "2026-09-01T00:00:00Z",
    expiresAt: "2026-10-15T23:59:59Z",
    isActive: true,
  },
];

const INITIAL_BANK_OFFERS: BankPaymentOffer[] = [
  {
    id: "b1",
    bankName: "EasyPaisa Mobile Wallet",
    discountPercentage: 10,
    maxDiscountAmount: 800,
    cardType: "WALLET",
    isActive: true,
  },
  {
    id: "b2",
    bankName: "JazzCash Wallet",
    discountPercentage: 10,
    maxDiscountAmount: 800,
    cardType: "WALLET",
    isActive: true,
  },
  {
    id: "b3",
    bankName: "HBL Debit & Credit Cards",
    discountPercentage: 15,
    maxDiscountAmount: 1500,
    cardType: "CREDIT",
    isActive: true,
  },
];

const INITIAL_FLASH_CAMPAIGNS: FlashCampaign[] = [
  {
    id: "f1",
    title: "Blessed Friday Super Deals 2026",
    bannerText: "⚡ BLESSED FRIDAY SALE: Up to 25% OFF Fast Chargers & Power Banks!",
    discountPercentage: 25,
    productIds: ["VG-CHG-65W", "VG-PB-10K"],
    startsAt: "2026-09-01T00:00:00Z",
    endsAt: "2026-09-10T23:59:59Z",
    isActive: true,
  },
];

export default function AdminPromotionsPage() {
  const [activeTab, setActiveTab] = useState<"COUPONS" | "BANKS" | "CAMPAIGNS">("COUPONS");
  const [coupons, setCoupons] = useState<DiscountCoupon[]>(INITIAL_COUPONS);
  const [bankOffers, setBankOffers] = useState<BankPaymentOffer[]>(INITIAL_BANK_OFFERS);
  const [campaigns] = useState<FlashCampaign[]>(INITIAL_FLASH_CAMPAIGNS);

  // New Coupon Form state
  const [newCode, setNewCode] = useState("");
  const [newValue, setNewValue] = useState(10);
  const [newMinOrder, setNewMinOrder] = useState(3000);

  function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode) return;

    const coupon: DiscountCoupon = {
      id: `c_${Date.now()}`,
      code: newCode.toUpperCase().trim(),
      type: "PERCENTAGE",
      value: Number(newValue),
      minOrderAmount: Number(newMinOrder),
      maxUsageCount: 1000,
      usageCount: 0,
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      isActive: true,
    };

    setCoupons([coupon, ...coupons]);
    setNewCode("");
  }

  function toggleCouponStatus(id: string) {
    setCoupons(coupons.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c)));
  }

  function toggleBankOfferStatus(id: string) {
    setBankOffers(bankOffers.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b)));
  }

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#1F3626] rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Sparkles className="h-4 w-4" /> VoltGear Merchant Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Promotions & Discounts Manager</h1>
          <p className="text-xs md:text-sm text-white/80 mt-1">
            Manage discount coupons, Pakistani bank checkout deals (EasyPaisa, JazzCash, HBL), and Flash Sale campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("COUPONS")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "COUPONS" ? "bg-amber-500 text-white shadow" : "text-white/80 hover:text-white"
            }`}
          >
            <Tag className="h-4 w-4" /> Coupons
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("BANKS")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "BANKS" ? "bg-amber-500 text-white shadow" : "text-white/80 hover:text-white"
            }`}
          >
            <CreditCard className="h-4 w-4" /> Bank Offers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CAMPAIGNS")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "CAMPAIGNS" ? "bg-amber-500 text-white shadow" : "text-white/80 hover:text-white"
            }`}
          >
            <Flame className="h-4 w-4" /> Flash Deals
          </button>
        </div>
      </div>

      {/* 🎟️ TAB 1: DISCOUNT COUPONS */}
      {activeTab === "COUPONS" && (
        <div className="space-y-6">
          {/* Quick Create Coupon Card */}
          <form onSubmit={handleCreateCoupon} className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" /> Create New Discount Coupon Code
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. SAVE15"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-[#1F3626]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Discount %</label>
                <input
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[#1F3626]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Min Order Amount (PKR)</label>
                <input
                  type="number"
                  value={newMinOrder}
                  onChange={(e) => setNewMinOrder(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[#1F3626]"
                />
              </div>
            </div>
            <Button type="submit" className="bg-[#1F3626] text-white hover:bg-[#2a4633] text-xs font-bold px-5 py-2 rounded-lg">
              Create Coupon Code
            </Button>
          </form>

          {/* Existing Coupons List */}
          <div className="grid gap-4">
            {coupons.map((c) => (
              <div key={c.id} className="bg-white border rounded-xl p-5 shadow-sm flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-900 text-xs font-mono font-bold px-2.5 py-0.5 rounded border border-amber-300">
                      {c.code}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      {c.type === "PERCENTAGE" ? `${c.value}% OFF` : `Rs. ${c.value} OFF`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Min Order: Rs. {c.minOrderAmount?.toLocaleString()} • Used {c.usageCount} times
                  </p>
                </div>

                <Button
                  onClick={() => toggleCouponStatus(c.id)}
                  className={`text-xs font-bold px-4 py-1.5 rounded-lg transition ${
                    c.isActive ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {c.isActive ? "ACTIVE" : "DISABLED"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 💳 TAB 2: BANK & WALLET OFFERS */}
      {activeTab === "BANKS" && (
        <div className="grid gap-4">
          <h2 className="text-lg font-bold text-gray-900">Pakistani Bank & Wallet Checkout Discounts</h2>
          {bankOffers.map((b) => (
            <div key={b.id} className="bg-white border rounded-xl p-5 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{b.bankName}</h3>
                  <p className="text-xs text-gray-500">
                    {b.discountPercentage}% Instant Discount at Checkout (Max Cap: Rs. {b.maxDiscountAmount.toLocaleString()})
                  </p>
                </div>
              </div>

              <Button
                onClick={() => toggleBankOfferStatus(b.id)}
                className={`text-xs font-bold px-4 py-1.5 rounded-lg transition ${
                  b.isActive ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {b.isActive ? "OFFER ACTIVE" : "OFFER PAUSED"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ⚡ TAB 3: FLASH SALE CAMPAIGNS */}
      {activeTab === "CAMPAIGNS" && (
        <div className="grid gap-4">
          <h2 className="text-lg font-bold text-gray-900">Flash Sale Deals & Site Campaigns</h2>
          {campaigns.map((f) => (
            <div key={f.id} className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">⚡ FLASH CAMPAIGN</span>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded">LIVE ON STOREFRONT</span>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">{f.title}</h3>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs font-semibold text-amber-900">
                {f.bannerText}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
