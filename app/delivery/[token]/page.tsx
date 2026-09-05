"use client";

import React, { useState } from "react";
import { Package, Truck, CheckCircle2, Clock, MapPin, PhoneCall, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerDeliveryRescuePage({ params }: { params: { token: string } }) {
  const [selectedAction, setSelectedAction] = useState<"RETRY" | "ADDRESS" | "PHONE" | null>(null);
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulate API save
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border shadow-lg overflow-hidden">
        {/* Header Banner */}
        <div className="bg-[#1F3626] p-6 text-white text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10 mb-3">
            <Truck className="h-6 w-6 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold">Buy n Try Delivery Update</h1>
          <p className="text-xs text-white/80 mt-1">We need your input to complete your delivery</p>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <h2 className="text-lg font-bold text-gray-900">Thank You!</h2>
            <p className="text-sm text-gray-600">
              Your delivery instructions have been updated. Our courier team will attempt delivery accordingly.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Delivery Notice:</span>
                <p className="mt-0.5">The courier attempted delivery today, but was unable to reach you.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Select your preferred option:
              </label>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAction("RETRY")}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm transition ${
                    selectedAction === "RETRY" ? "border-[#1F3626] bg-[#1F3626]/5 font-bold" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Clock className="h-5 w-5 text-[#1F3626]" />
                  <div>
                    <div>I'm Available for Tomorrow</div>
                    <div className="text-xs font-normal text-gray-500">Keep my current delivery details</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAction("ADDRESS")}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm transition ${
                    selectedAction === "ADDRESS" ? "border-[#1F3626] bg-[#1F3626]/5 font-bold" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <MapPin className="h-5 w-5 text-[#1F3626]" />
                  <div>
                    <div>Correct Street Address / House #</div>
                    <div className="text-xs font-normal text-gray-500">Provide missing address details</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAction("PHONE")}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm transition ${
                    selectedAction === "PHONE" ? "border-[#1F3626] bg-[#1F3626]/5 font-bold" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <PhoneCall className="h-5 w-5 text-[#1F3626]" />
                  <div>
                    <div>Update Contact Number</div>
                    <div className="text-xs font-normal text-gray-500">Provide an alternate phone number</div>
                  </div>
                </button>
              </div>

              {selectedAction === "ADDRESS" && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">New Complete Address</label>
                  <input
                    type="text"
                    required
                    placeholder="House #, Street #, Sector/Block, City"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full min-w-0 rounded-lg border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#1F3626] sm:text-sm"
                  />
                </div>
              )}

              {selectedAction === "PHONE" && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">New Mobile Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="0300 1234567"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full min-w-0 rounded-lg border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#1F3626] sm:text-sm"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={!selectedAction || loading}
                className="w-full bg-[#1F3626] text-white hover:bg-[#2a4633] py-5 rounded-xl text-sm font-bold"
              >
                {loading ? "Updating Courier Instructions…" : "Confirm Delivery Update"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
