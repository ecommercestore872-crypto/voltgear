"use client";

import { useState } from "react";

import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";

type ConnectivityResult = {
  success?: boolean;
  operationalCityCount?: number;
  statusMessage?: string | null;
  error?: string;
};

type PickupRow = {
  addressCode: string | null;
  cityName: string | null;
  address: string | null;
  contactPersonName: string | null;
};

type PickupResult = {
  success?: boolean;
  pickupAddresses?: PickupRow[];
  error?: string;
};

export function PostExShippingPanel() {
  const [connectivity, setConnectivity] = useState<ConnectivityResult | null>(
    null,
  );
  const [pickups, setPickups] = useState<PickupResult | null>(null);
  const [loading, setLoading] = useState<"connect" | "pickup" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runConnectivity() {
    setLoading("connect");
    setError(null);
    try {
      const data = (await adminFetch(
        "/api/admin/postex/connectivity",
      )) as ConnectivityResult;
      setConnectivity(data);
    } catch (err) {
      if (err instanceof AdminAuthError) throw err;
      setError(
        err instanceof Error ? err.message : "Connectivity check failed.",
      );
    } finally {
      setLoading(null);
    }
  }

  async function loadPickupAddresses() {
    setLoading("pickup");
    setError(null);
    try {
      const data = (await adminFetch(
        "/api/admin/postex/pickup-address",
      )) as PickupResult;
      setPickups(data);
    } catch (err) {
      if (err instanceof AdminAuthError) throw err;
      setError(
        err instanceof Error ? err.message : "Could not load pickup addresses.",
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="mx-auto max-w-5xl rounded-lg border p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">PostEx shipping (COD courier)</h2>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          Server-side only: set{" "}
          <code className="text-xs">POSTEX_API_TOKEN</code> and{" "}
          <code className="text-xs">POSTEX_PICKUP_ADDRESS_CODE</code> on the{" "}
          <strong>admin</strong> Vercel project. Booking runs from each order
          detail page — never on checkout automatically.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={loading != null}
          onClick={() => void runConnectivity()}
        >
          {loading === "connect" ? "Checking…" : "Test PostEx API"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading != null}
          onClick={() => void loadPickupAddresses()}
        >
          {loading === "pickup" ? "Loading…" : "List pickup addresses"}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      ) : null}

      {connectivity ? (
        <div className="text-sm rounded-md border bg-muted/30 px-3 py-2 space-y-1">
          <p>
            <span className="font-medium">Connectivity:</span>{" "}
            {connectivity.success ? "OK" : "Failed"}
          </p>
          {connectivity.operationalCityCount != null ? (
            <p>
              Operational cities: {connectivity.operationalCityCount}
            </p>
          ) : null}
          {connectivity.statusMessage ? (
            <p className="text-muted-foreground">{connectivity.statusMessage}</p>
          ) : null}
          {connectivity.error ? (
            <p className="text-destructive">{connectivity.error}</p>
          ) : null}
        </div>
      ) : null}

      {pickups?.pickupAddresses?.length ? (
        <div className="text-sm overflow-x-auto">
          <p className="font-medium mb-2">Registered pickup addresses</p>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-1 pr-3">Code</th>
                <th className="py-1 pr-3">City</th>
                <th className="py-1">Address</th>
              </tr>
            </thead>
            <tbody>
              {pickups.pickupAddresses.map((row, i) => (
                <tr key={`${row.addressCode ?? "row"}-${i}`} className="border-b">
                  <td className="py-2 pr-3 font-mono text-xs">
                    {row.addressCode ?? "—"}
                  </td>
                  <td className="py-2 pr-3">{row.cityName ?? "—"}</td>
                  <td className="py-2">{row.address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-muted-foreground text-xs">
            Copy the code into{" "}
            <code className="text-xs">POSTEX_PICKUP_ADDRESS_CODE</code> on admin
            Vercel, then redeploy.
          </p>
        </div>
      ) : null}

      {pickups && !pickups.pickupAddresses?.length && pickups.error ? (
        <p className="text-sm text-destructive">{pickups.error}</p>
      ) : null}
    </section>
  );
}
