"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
  PackageCheck,
  DollarSign,
  Truck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  OperationalException,
  OperationalSummaryStats,
} from "@/lib/autopilot/command-types";

interface Props {
  exceptions: OperationalException[];
  stats: OperationalSummaryStats;
}

export function OwnerCommandCenterDashboard({
  exceptions: initialExceptions,
  stats,
}: Props) {
  const [exceptions, setExceptions] = useState(initialExceptions);

  function handleResolve(id: string) {
    setExceptions((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#1F3626] rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Sparkles className="h-4 w-4" /> VoltGear Operations Autopilot
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Owner Command Center
          </h1>
          <p className="text-xs md:text-sm text-white/80 mt-1">
            Autonomous commerce engine active. Surfacing only actionable
            operational exceptions.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 px-5 py-3 rounded-xl backdrop-blur-md">
          <div className="text-right">
            <div className="text-xs text-white/70 font-medium">
              24h Autopilot Rate
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {stats.automationRatePercentage}%
            </div>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="text-right">
            <div className="text-xs text-white/70 font-medium">
              Manual Hours Saved
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {stats.manualHoursSaved}h
            </div>
          </div>
        </div>
      </div>

      {/* Autopilot Operational Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Auto Dispatched</span>
            <Truck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {stats.ordersAutoDispatched} Orders
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">
            ✓ 100% PostEx / Leopards synced
          </div>
        </div>

        <div className="bg-white border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Deliveries Rescued</span>
            <PackageCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {stats.shipmentsAutoRescued} Parcels
          </div>
          <div className="text-[10px] text-blue-600 font-medium">
            ✓ Zero merchant intervention
          </div>
        </div>

        <div className="bg-white border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>COD Reconciled</span>
            <DollarSign className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            Rs. {stats.codReconciledAmount.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-600 font-medium">
            ✓ 0 Payout mismatches
          </div>
        </div>

        <div className="bg-white border p-4 rounded-xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Inventory Actions</span>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {stats.inventoryActionsCompleted} Actions
          </div>
          <div className="text-[10px] text-purple-600 font-medium">
            ✓ Concurrency safe allocations
          </div>
        </div>
      </div>

      {/* Actionable Exceptions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">
              Action Required Queue
            </h2>
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {exceptions.length} Decisions
            </span>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Ranked by Financial & Operational Urgency
          </div>
        </div>

        {exceptions.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-12 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <h3 className="text-lg font-bold text-emerald-950">
              Everything is Running Smoothly!
            </h3>
            <p className="text-xs text-emerald-700 max-w-md mx-auto">
              No operational exceptions require your intervention right now. All
              order dispatches, delivery rescue attempts, and inventory
              allocations are executing autonomously.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      ex.severity === "CRITICAL"
                        ? "bg-rose-100 text-rose-600"
                        : ex.severity === "HIGH"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {ex.severity === "CRITICAL" ? (
                      <ShieldAlert className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          ex.severity === "CRITICAL"
                            ? "bg-rose-600 text-white"
                            : ex.severity === "HIGH"
                              ? "bg-amber-600 text-white"
                              : "bg-blue-600 text-white"
                        }`}
                      >
                        {ex.severity}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {ex.domain}
                      </span>
                      {ex.amountAtRisk && (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Rs. {ex.amountAtRisk.toLocaleString()} At Risk
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">
                      {ex.title}
                    </h3>
                    <p className="text-xs text-gray-600 max-w-2xl">
                      {ex.summary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0">
                  <Button
                    onClick={() => handleResolve(ex.id)}
                    className="bg-[#1F3626] text-white hover:bg-[#2a4633] text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
                  >
                    <span>{ex.recommendedAction}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
