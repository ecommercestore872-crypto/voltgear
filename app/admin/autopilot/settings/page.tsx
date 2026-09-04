"use client";

import React, { useState } from "react";

import {
  Power,
  CheckCircle2,
  Database,
  Truck,
  PackageCheck,
  DollarSign,
  TrendingUp,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAutopilotSettings, updateAutopilotSettings } from "@/lib/autopilot/telemetry-guard";
import { AutopilotMode } from "@/lib/autopilot/settings";

export default function AutopilotSettingsPage() {
  const [settings, setSettings] = useState(getAutopilotSettings());
  const [saved, setSaved] = useState(false);

  function handleModeChange(key: keyof typeof settings, value: boolean | string | AutopilotMode) {
    const updated = updateAutopilotSettings({ [key]: value });
    setSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#1F3626] rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Sliders className="h-4 w-4" /> VoltGear Operations Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Master Autopilot Control Center</h1>
          <p className="text-xs md:text-sm text-white/80 mt-1">
            Toggle full automation, enable passive background telemetry, or customize individual automation modes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleModeChange("masterEnabled", !settings.masterEnabled)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              settings.masterEnabled ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-rose-600 text-white hover:bg-rose-700"
            }`}
          >
            <Power className="h-4 w-4" />
            <span>{settings.masterEnabled ? "Autopilot System ONLINE" : "Autopilot System OFFLINE"}</span>
          </Button>
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold p-4 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Autopilot control settings updated successfully!</span>
        </div>
      )}

      {/* Passive Background Telemetry Card */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-amber-950 text-base">Continuous Background Telemetry Gathering</h3>
            <p className="text-xs text-amber-800/90 mt-0.5 max-w-2xl">
              When enabled, automations in <span className="font-bold">OFF</span> or <span className="font-bold">SHADOW</span> mode continuously observe tracking events, address patterns, and inventory velocity in the background to build accuracy rules without taking external actions.
            </p>
          </div>
        </div>

        <Button
          onClick={() => handleModeChange("telemetryGatheringEnabled", !settings.telemetryGatheringEnabled)}
          className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${
            settings.telemetryGatheringEnabled ? "bg-amber-600 text-white border-amber-600" : "bg-white text-gray-700 border-gray-300"
          }`}
        >
          {settings.telemetryGatheringEnabled ? "Telemetry Active" : "Telemetry Paused"}
        </Button>
      </div>

      {/* Individual Automation Mode Selectors */}
      <div className="grid gap-6">
        <h2 className="text-lg font-bold text-gray-900">Automation Subsystem Toggles</h2>

        {/* 1. Order-to-Dispatch */}
        <AutomationControlCard
          title="Automation #1: Order-to-Dispatch Autopilot"
          description="Automatic validation, city mapping, phone normalization, and PostEx courier booking."
          icon={<Truck className="h-5 w-5 text-emerald-600" />}
          mode={settings.orderDispatchMode}
          onModeChange={(mode) => handleModeChange("orderDispatchMode", mode)}
        />

        {/* 2. Delivery Rescue */}
        <AutomationControlCard
          title="Automation #2: Delivery Rescue Autopilot"
          description="Courier status normalization, failure classification, and customer self-service portal."
          icon={<PackageCheck className="h-5 w-5 text-blue-600" />}
          mode={settings.deliveryRescueMode}
          onModeChange={(mode) => handleModeChange("deliveryRescueMode", mode)}
        />

        {/* 3. COD Settlement */}
        <AutomationControlCard
          title="Automation #3: COD Settlement Autopilot"
          description="Payout statement ingestion, order-to-payout matching, and fee overcharge auditing."
          icon={<DollarSign className="h-5 w-5 text-amber-600" />}
          mode={settings.settlementReconciliationMode}
          onModeChange={(mode) => handleModeChange("settlementReconciliationMode", mode)}
        />

        {/* 4. Inventory & Reorder */}
        <AutomationControlCard
          title="Automation #4: Inventory & Reorder Autopilot"
          description="Multi-state inventory allocation, ROP forecasting, and automated purchase recommendations."
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          mode={settings.inventoryReorderMode}
          onModeChange={(mode) => handleModeChange("inventoryReorderMode", mode)}
        />
      </div>
    </div>
  );
}

interface CardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  mode: AutopilotMode;
  onModeChange: (mode: AutopilotMode) => void;
}

function AutomationControlCard({ title, description, icon, mode, onModeChange }: CardProps) {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-gray-50 border flex items-center justify-center shrink-0 mt-0.5">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm md:text-base">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl shrink-0 self-end md:self-center">
        <button
          type="button"
          onClick={() => onModeChange("ACTIVE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            mode === "ACTIVE" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          ACTIVE
        </button>

        <button
          type="button"
          onClick={() => onModeChange("SHADOW_TELEMETRY")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            mode === "SHADOW_TELEMETRY" ? "bg-amber-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          SHADOW / TELEMETRY
        </button>

        <button
          type="button"
          onClick={() => onModeChange("DISABLED")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            mode === "DISABLED" ? "bg-rose-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          OFF
        </button>
      </div>
    </div>
  );
}
