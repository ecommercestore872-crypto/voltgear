"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Truck,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/types";

interface ExceptionCenterProps {
  orders: Order[];
}

export function ExceptionCenter({ orders }: ExceptionCenterProps) {
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    id: string;
    msg: string;
    isError?: boolean;
  } | null>(null);

  // Filter orders needing attention (e.g. status === "new" or pending)
  const pendingOrders = orders.filter((o) => o.status === "new" || !o.status);

  // Auto-Fulfill candidates (Mock simulation of validation engine output)
  const safeOrders = pendingOrders.filter(
    (o) => o.customer?.phone && o.customer?.address && (o.total || 0) < 25000,
  );
  const exceptionOrders = pendingOrders.filter(
    (o) =>
      !o.customer?.phone || !o.customer?.address || (o.total || 0) >= 25000,
  );

  async function handleDispatch(orderId: string, force = false) {
    setLoadingOrderId(orderId);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin/autopilot/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, forceDispatch: force }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Dispatch failed.");
      }
      setActionMessage({
        id: orderId,
        msg: `Order #${orderId} booked with PostEx (Tracking: ${data.trackingNumber})`,
      });
    } catch (err: any) {
      setActionMessage({
        id: orderId,
        msg: err.message || "Failed to dispatch",
        isError: true,
      });
    } finally {
      setLoadingOrderId(null);
    }
  }

  async function handleAutoFulfillAll() {
    setLoadingOrderId("ALL");
    for (const o of safeOrders) {
      await handleDispatch(o.orderId);
    }
    setLoadingOrderId(null);
  }

  return (
    <div className="space-y-6">
      {/* Top Metrics Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-sm text-gray-500 font-medium">
            <span>Orders Received</span>
            <Truck className="h-4 w-4 text-[#1F3626]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {orders.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Total store orders</p>
        </div>

        <div className="rounded-xl border bg-emerald-50/50 border-emerald-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-sm text-emerald-800 font-medium">
            <span>AUTO_READY (Hands-Free)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-950">
            {safeOrders.length}
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Ready for auto-fulfillment
          </p>
        </div>

        <div className="rounded-xl border bg-amber-50/50 border-amber-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-sm text-amber-800 font-medium">
            <span>Actionable Exceptions</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-950">
            {exceptionOrders.length}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Requires merchant review
          </p>
        </div>
      </div>

      {/* Auto-Fulfill Trigger Bar */}
      {safeOrders.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-[#1F3626]/20 bg-[#1F3626]/5 p-4">
          <div>
            <h4 className="font-bold text-[#1F3626] text-sm">
              Autopilot Batch Action
            </h4>
            <p className="text-xs text-gray-600">
              {safeOrders.length} orders are 100% validated with clean phone,
              address, and COD limits.
            </p>
          </div>
          <Button
            onClick={handleAutoFulfillAll}
            disabled={loadingOrderId === "ALL"}
            className="bg-[#1F3626] text-white hover:bg-[#2a4633]"
          >
            {loadingOrderId === "ALL"
              ? "Processing Batch…"
              : `Dispatch All ${safeOrders.length} Safe Orders`}
          </Button>
        </div>
      )}

      {/* Exceptions List */}
      <div className="rounded-xl border bg-white overflow-hidden shadow-xs">
        <div className="border-b px-5 py-4 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold text-gray-900">
              Autopilot Exception Center
            </h3>
          </div>
          <span className="text-xs text-gray-500">
            Only showing orders needing attention
          </span>
        </div>

        {exceptionOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
            No active exceptions! All incoming orders passed automated checks
            cleanly.
          </div>
        ) : (
          <div className="divide-y">
            {exceptionOrders.map((o) => (
              <div
                key={o.orderId}
                className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-gray-50/80"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">
                      Order #{o.orderId}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      NEEDS_REVIEW
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Customer:{" "}
                    <span className="font-medium text-gray-900">
                      {o.customer?.name || "—"}
                    </span>{" "}
                    · {o.customer?.phone || "Missing Phone"} ·{" "}
                    {o.customer?.city || "Missing City"}
                  </p>
                  <p className="text-xs text-amber-700 font-medium">
                    ⚠ Reason:{" "}
                    {(o.total || 0) >= 25000
                      ? "High Value COD Amount"
                      : "Incomplete address or phone format"}
                  </p>
                  {actionMessage && actionMessage.id === o.orderId && (
                    <p
                      className={`text-xs font-bold ${actionMessage.isError ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {actionMessage.msg}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingOrderId === o.orderId}
                    onClick={() => handleDispatch(o.orderId, true)}
                  >
                    {loadingOrderId === o.orderId
                      ? "Dispatching…"
                      : "Approve & Dispatch"}
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
