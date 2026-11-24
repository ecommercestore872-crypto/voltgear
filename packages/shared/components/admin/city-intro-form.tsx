"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CityIntroForm({
  cities,
  initial,
}: {
  cities: { slug: string; name: string }[];
  initial: Record<string, string>;
}) {
  const router = useRouter();
  const [intros, setIntros] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await adminFetch("/api/admin/city-seo", { method: "PUT", body: JSON.stringify({ intros }) });
      setMessage("Saved.");
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) {
        router.replace("/admin/login");
        return;
      }
      setMessage(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">City page intros</h1>
        <p className="text-sm text-muted-foreground">
          Write a unique intro for each /cod city page. Do not reuse text between cities. Leave empty to use the default.
        </p>
      </div>
      <div className="space-y-6 bg-card border rounded-2xl p-6 shadow-sm">
        {cities.map((city) => (
          <div key={city.slug} className="space-y-1.5">
            <Label htmlFor={`city-${city.slug}`} className="text-foreground font-semibold">{city.name}</Label>
            <Textarea
              id={`city-${city.slug}`}
              value={intros[city.slug] ?? ""}
              onChange={(e) => setIntros((prev) => ({ ...prev, [city.slug]: e.target.value }))}
              className="h-28 bg-muted/50 border-border/50"
            />
          </div>
        ))}
      </div>
      {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
      <Button type="button" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save intros"}
      </Button>
    </div>
  );
}
