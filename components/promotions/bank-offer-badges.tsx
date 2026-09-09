"use client";

import React from "react";
import { CreditCard, Building2, Wallet, ShieldCheck } from "lucide-react";

export function BankOfferBadges() {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold text-blue-950 uppercase tracking-wider">
        <CreditCard className="h-4 w-4 text-blue-600" />
        <span>Instant Checkout Discounts (Pakistan Payment Methods)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <div className="bg-white p-2.5 rounded-lg border border-blue-100 flex items-center gap-2 shadow-2xs">
          <div className="h-6 w-6 rounded bg-emerald-100 text-emerald-700 font-extrabold text-[10px] flex items-center justify-center shrink-0">
            EP
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900">EasyPaisa</div>
            <div className="text-[10px] font-semibold text-emerald-600">
              10% Instant OFF
            </div>
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-blue-100 flex items-center gap-2 shadow-2xs">
          <div className="h-6 w-6 rounded bg-red-100 text-red-700 font-extrabold text-[10px] flex items-center justify-center shrink-0">
            JC
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900">JazzCash</div>
            <div className="text-[10px] font-semibold text-red-600">
              10% Instant OFF
            </div>
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-blue-100 flex items-center gap-2 shadow-2xs">
          <div className="h-6 w-6 rounded bg-blue-100 text-blue-700 font-extrabold text-[10px] flex items-center justify-center shrink-0">
            HBL
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900">HBL / Meezan</div>
            <div className="text-[10px] font-semibold text-blue-600">
              15% Card OFF
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
