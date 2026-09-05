"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PublishBar } from "@/components/admin/publish-bar";
import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublishStatus } from "@/lib/db/publish";
import {
  DEFAULT_INVOICE_TEMPLATE,
  mergeInvoiceTemplate,
  type InvoiceTemplate,
} from "@/lib/invoice-template-rules";

function fromConfig(config?: InvoiceTemplate | null) {
  const merged = mergeInvoiceTemplate(config);
  return {
    documentTitle: merged.documentTitle,
    accent: merged.accent,
    footer: merged.footer,
    notes: merged.notes,
    logoUrl: merged.logoUrl,
    companyName: merged.companyName,
    companyEmail: merged.companyEmail,
    companyPhone: merged.companyPhone,
    companyAddress: merged.companyAddress,
    companyWebsite: merged.companyWebsite,
  };
}

export function InvoiceTemplateForm({
  config,
  hasDraft,
}: {
  config?: InvoiceTemplate | null;
  hasDraft?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => fromConfig(config));
  const [status, setStatus] = useState<PublishStatus>(hasDraft ? "draft" : "published");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function doc(): InvoiceTemplate {
    return mergeInvoiceTemplate(form);
  }

  async function run(action: "save" | "publish" | "discard") {
    setSaving(true);
    setError(null);
    try {
      await adminFetch("/api/admin/invoice-template", {
        method: "PATCH",
        body: JSON.stringify({ action, doc: doc() }),
      });
      if (action === "publish") setStatus("published");
      if (action === "save") setStatus("draft");
      if (action === "discard") setStatus("published");
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Invoice template</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One-page PDF for customers. Empty fields use the code default in{" "}
          <code>lib/invoice-template-rules.ts</code>, then store Settings (name, logo, email,
          phone, address).
        </p>
      </div>
      <PublishBar
        status={status}
        saving={saving}
        onSave={() => run("save")}
        onPublish={() => run("publish")}
        onDiscard={() => run("discard")}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <Label htmlFor="documentTitle">Document title</Label>
          <Input
            id="documentTitle"
            value={form.documentTitle}
            placeholder={DEFAULT_INVOICE_TEMPLATE.documentTitle}
            onChange={(e) => set("documentTitle", e.target.value)}
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <Label htmlFor="accent">Accent color</Label>
          <div className="flex gap-2">
            <Input
              id="accent"
              value={form.accent}
              placeholder={DEFAULT_INVOICE_TEMPLATE.accent}
              onChange={(e) => set("accent", e.target.value)}
            />
            <input
              type="color"
              aria-label="Pick accent"
              className="h-11 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
              value={/^#([0-9a-fA-F]{6})$/.test(form.accent) ? form.accent : DEFAULT_INVOICE_TEMPLATE.accent}
              onChange={(e) => set("accent", e.target.value)}
            />
          </div>
        </label>
        <label className="space-y-1.5 text-sm sm:col-span-2">
          <Label htmlFor="logoUrl">Logo URL (optional)</Label>
          <Input
            id="logoUrl"
            value={form.logoUrl}
            placeholder="Leave empty to use Settings logo"
            onChange={(e) => set("logoUrl", e.target.value)}
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            value={form.companyName}
            placeholder="Uses Settings brand name"
            onChange={(e) => set("companyName", e.target.value)}
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <Label htmlFor="companyWebsite">Website</Label>
          <Input
            id="companyWebsite"
            value={form.companyWebsite}
            placeholder="buyntryy.com"
            onChange={(e) => set("companyWebsite", e.target.value)}
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <Label htmlFor="companyEmail">Email</Label>
          <Input
            id="companyEmail"
            value={form.companyEmail}
            placeholder="Uses Settings email"
            onChange={(e) => set("companyEmail", e.target.value)}
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <Label htmlFor="companyPhone">Phone</Label>
          <Input
            id="companyPhone"
            value={form.companyPhone}
            placeholder="Uses Settings phone"
            onChange={(e) => set("companyPhone", e.target.value)}
          />
        </label>
        <label className="space-y-1.5 text-sm sm:col-span-2">
          <Label htmlFor="companyAddress">Address</Label>
          <Input
            id="companyAddress"
            value={form.companyAddress}
            placeholder="Uses Settings address"
            onChange={(e) => set("companyAddress", e.target.value)}
          />
        </label>
        <label className="space-y-1.5 text-sm sm:col-span-2">
          <Label htmlFor="footer">Footer</Label>
          <Input
            id="footer"
            value={form.footer}
            placeholder={DEFAULT_INVOICE_TEMPLATE.footer}
            onChange={(e) => set("footer", e.target.value)}
          />
        </label>
        <label className="space-y-1.5 text-sm sm:col-span-2">
          <Label htmlFor="notes">Notes (optional, one short line)</Label>
          <Textarea
            id="notes"
            rows={2}
            value={form.notes}
            placeholder="Shown only if filled — keep it short so the PDF stays one page."
            onChange={(e) => set("notes", e.target.value)}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Store identity still lives in{" "}
        <Link href="/admin/settings" className="underline">
          Settings
        </Link>
        . Open any order and choose Download Invoice to preview.
      </p>
    </div>
  );
}
