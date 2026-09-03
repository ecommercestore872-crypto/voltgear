"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Target,
  Flame,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildAdBudgetOverview } from "@/lib/autopilot/ad-engine";
import { ProductAdMetrics } from "@/lib/autopilot/ad-types";

const MOCK_PRODUCTS: ProductAdMetrics[] = [
  {
    productId: "p1",
    productName: "65W GaN Fast Wall Charger",
    sku: "VG-CHG-65W",
    price: 4999,
    cogs: 2200,
    estimatedShippingCost: 250,
    rtoRatePercentage: 8,
    currentStock: 85,
    daysOfStockRemaining: 18,
    adSpend: 15000,
    pixelRoas: 3.2,
  },
  {
    productId: "p2",
    productName: "Magnetic Wireless Power Bank 10,000mAh",
    sku: "VG-PB-10K",
    price: 6499,
    cogs: 3100,
    estimatedShippingCost: 250,
    rtoRatePercentage: 12,
    currentStock: 12,
    daysOfStockRemaining: 2, // Low stock alert!
    adSpend: 12000,
    pixelRoas: 2.8,
  },
  {
    productId: "p3",
    productName: "Braided Nylon USB-C to Lightning Cable",
    sku: "VG-CBL-NYL",
    price: 1899,
    cogs: 700,
    estimatedShippingCost: 250,
    rtoRatePercentage: 22, // High RTO alert!
    currentStock: 140,
    daysOfStockRemaining: 28,
    adSpend: 8000,
    pixelRoas: 1.8,
  },
];

export default function AdIntelligencePage() {
  const [dailyBudget, setDailyBudget] = useState(10000);
  const overview = buildAdBudgetOverview(MOCK_PRODUCTS, dailyBudget);

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#1F3626] rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Zap className="h-4 w-4" /> VoltGear Commerce Autopilot
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Ad Budget & Profitability Autopilot</h1>
          <p className="text-xs md:text-sm text-white/80 mt-1 max-w-xl">
            Lightweight ad spend advisor for Pakistan e-commerce. Protect your margins, scale profit winners, and never advertise out-of-stock items.
          </p>
        </div>

        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10 space-y-2 w-full md:w-auto">
          <label className="text-xs text-white/80 font-medium block">Target Daily Ad Budget (PKR)</label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-amber-400">Rs.</span>
            <input
              type="number"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(Number(e.target.value) || 0)}
              className="bg-white/20 text-white font-bold text-lg px-3 py-1 rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Recommended Allocation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-emerald-200 p-5 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-bold uppercase tracking-wider">
            <span>🔥 Hero Winners (60%)</span>
            <Flame className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            Rs. {overview.winnerAllocatedBudget.toLocaleString()} / day
          </div>
          <p className="text-xs text-gray-500">
            High margin products with Delivered ROAS exceeding breakeven targets.
          </p>
        </div>

        <div className="bg-white border border-blue-200 p-5 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-700 font-bold uppercase tracking-wider">
            <span>🧪 Micro Testing (20%)</span>
            <Target className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            Rs. {overview.testingAllocatedBudget.toLocaleString()} / day
          </div>
          <p className="text-xs text-gray-500">
            Testing budget to validate new creatives and fresh product listings.
          </p>
        </div>

        <div className="bg-white border border-purple-200 p-5 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-purple-700 font-bold uppercase tracking-wider">
            <span>🎯 Retargeting (20%)</span>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            Rs. {overview.retargetingAllocatedBudget.toLocaleString()} / day
          </div>
          <p className="text-xs text-gray-500">
            Remind warm site visitors & abandoned checkout sessions.
          </p>
        </div>
      </div>

      {/* Product Ad Allocation Table & Advice */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Product ROAS & Ad Guidance</h2>

        <div className="grid gap-4">
          {overview.recommendations.map((rec) => (
            <div
              key={rec.productId}
              className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      rec.tier === "HERO_WINNER"
                        ? "bg-emerald-600 text-white"
                        : rec.tier === "PAUSE_IMMINENT"
                        ? "bg-rose-600 text-white"
                        : rec.tier === "HIGH_RTO_RISK"
                        ? "bg-amber-600 text-white"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {rec.tier.replace("_", " ")}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">{rec.sku}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-base">{rec.productName}</h3>
                <p className="text-xs text-gray-600">{rec.guidanceReason}</p>

                <div className="flex items-center gap-4 pt-1 text-xs text-gray-500 font-medium">
                  <div>
                    Breakeven ROAS: <span className="font-bold text-gray-900">{rec.breakevenRoas}x</span>
                  </div>
                  <div>•</div>
                  <div>
                    Delivered ROAS: <span className="font-bold text-emerald-600">{rec.realDeliveredRoas}x</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:items-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto">
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">Suggested Daily Budget</div>
                  <div className="text-xl font-bold text-gray-900">
                    Rs. {rec.recommendedDailyBudget.toLocaleString()}
                  </div>
                </div>
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  {rec.actionSummary}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
