"use client";

import { useEffect, useState } from "react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Promo = {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  firstOrderOnly: boolean;
  active: boolean;
  usageCount: number;
};

export function PromosManager() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [code, setCode] = useState("");
  const [type, setType] = useState<Promo["type"]>("percent");
  const [value, setValue] = useState("10");
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = (await adminFetch("/api/admin/promos")) as { promos?: Promo[] };
      setPromos(data.promos ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/admin/promos", {
        method: "POST",
        body: JSON.stringify({
          code,
          type,
          value: type === "free_shipping" ? 0 : Number(value),
          firstOrderOnly,
          active: true,
        }),
      });
      setCode("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p: Promo) {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/promos/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          code: p.code,
          type: p.type,
          value: p.value,
          firstOrderOnly: p.firstOrderOnly,
          active: !p.active,
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function deletePromo(p: Promo) {
    if (!confirm(`Delete code "${p.code}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/promos/${p.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Discounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Promo codes for checkout. Free shipping over a cart total stays in
          Settings — these are optional codes shoppers enter.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border bg-white p-4">
        <h2 className="font-semibold">New code</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Code</span>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="RAMADAN10"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Type</span>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as Promo["type"])}
            >
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed amount (PKR)</option>
              <option value="free_shipping">Free shipping</option>
            </select>
          </label>
          {type !== "free_shipping" ? (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">
                {type === "percent" ? "Percent" : "Amount (PKR)"}
              </span>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
              />
            </label>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={firstOrderOnly}
            onChange={(e) => setFirstOrderOnly(e.target.checked)}
          />
          First order only
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="button" disabled={busy || !code.trim()} onClick={() => void create()}>
          Create
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Uses</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-muted-foreground">
                  No codes yet.
                </td>
              </tr>
            ) : (
              promos.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{p.code}</td>
                  <td className="px-3 py-2">{p.type}</td>
                  <td className="px-3 py-2">
                    {p.type === "free_shipping"
                      ? "—"
                      : p.type === "percent"
                        ? `${p.value}%`
                        : p.value}
                    {p.firstOrderOnly ? " · first order" : ""}
                  </td>
                  <td className="px-3 py-2">{p.usageCount}</td>
                  <td className="px-3 py-2">{p.active ? "Active" : "Off"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void toggleActive(p)}
                      >
                        {p.active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => void deletePromo(p)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
