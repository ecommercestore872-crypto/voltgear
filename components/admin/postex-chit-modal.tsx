"use client";

import React, { useRef } from "react";
import { Printer, X, Package, Truck } from "lucide-react";
import type { Order } from "@/lib/types";

interface PostExChitModalProps {
  order: Order & { postex_tracking_number?: string };
  onClose: () => void;
}

export function PostExChitModal({ order, onClose }: PostExChitModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const trackingNo =
    order.postexTrackingNumber || order.postex_tracking_number || `PE-${order.orderId}`;
  const customer = order.customer || {};

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-200">
        {/* Header bar (Hidden on Print) */}
        <div className="flex items-center justify-between border-b px-5 py-3.5 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-[#1F3626]" />
            <h3 className="font-bold text-gray-900">PostEx Shipping Label (Chit)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F3626] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#2a4633]"
            >
              <Printer className="h-4 w-4" />
              Print Label
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Label Area (4x6 Inches Standard Thermal Aspect) */}
        <div className="overflow-y-auto p-6 bg-gray-100 flex justify-center print:bg-white print:p-0">
          <div
            ref={printRef}
            className="printable-chit w-[380px] bg-white border-2 border-black p-4 font-mono text-black shadow-md print:shadow-none print:w-full print:border-2 print:border-black"
          >
            {/* Header: PostEx & VoltGear Branding */}
            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
              <div>
                <h1 className="text-xl font-black tracking-wider uppercase">POSTEX</h1>
                <p className="text-[10px] font-sans font-bold text-gray-600">COD EXPRESS LOGISTICS</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold font-sans">VOLTGEAR PK</h2>
                <p className="text-[10px] font-sans text-gray-600">Accessories Hub</p>
              </div>
            </div>

            {/* Tracking Barcode & Details */}
            <div className="text-center border-b-2 border-black pb-2 mb-2">
              <p className="text-[11px] font-bold text-gray-500">TRACKING NUMBER</p>
              <p className="text-lg font-black tracking-widest my-0.5">{trackingNo}</p>
              {/* Barcode Mock Visual */}
              <div className="h-10 w-full bg-black/90 flex items-center justify-center text-white text-[10px] tracking-[0.4em] font-mono rounded-xs">
                ||||| | |||||| ||| ||||||| |||| ||||
              </div>
            </div>

            {/* Destination & Customer Info */}
            <div className="border-b-2 border-black pb-2 mb-2 text-xs">
              <div className="flex justify-between font-bold mb-1">
                <span>DESTINATION:</span>
                <span className="uppercase text-sm underline font-black">
                  {customer.city || "LAHORE"}
                </span>
              </div>
              <p className="font-bold text-sm">{customer.name || "Customer"}</p>
              <p className="text-[11px] leading-tight my-1">{customer.address || "Address not provided"}</p>
              <p className="font-bold text-[11px]">TEL: {customer.phone || "N/A"}</p>
            </div>

            {/* COD Amount Banner */}
            <div className="border-2 border-black bg-gray-100 p-2 text-center mb-2">
              <p className="text-[10px] font-bold tracking-wider">CASH ON DELIVERY (COD) TOTAL</p>
              <p className="text-xl font-black text-black">
                Rs. {(order.total || 0).toLocaleString()}
              </p>
            </div>

            {/* Order Items Summary */}
            <div className="text-[10px]">
              <div className="flex justify-between font-bold border-b border-black pb-1 mb-1">
                <span>ORDER #{order.orderId}</span>
                <span>QTY: {order.items?.length || 1}</span>
              </div>
              <div className="space-y-0.5 max-h-24 overflow-hidden">
                {(order.items || []).map((item, idx) => (
                  <p key={idx} className="truncate">
                    • {item.name} x{item.quantity || 1}
                  </p>
                ))}
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-3 pt-1 border-t border-dashed border-black text-[8px] text-center text-gray-600">
              Handled by PostEx Courier Service · Standard Delivery Terms Apply
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
