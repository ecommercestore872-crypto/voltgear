"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PublishBar } from "@/components/admin/publish-bar";
import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublishStatus } from "@/lib/db/publish";

type Row = {
  id: string;
  customer_name?: string;
  review_text?: string;
  rating?: number;
  product?: string;
  verified?: boolean;
  status?: PublishStatus;
  draft?: Record<string, unknown> | null;
  is_demo?: boolean;
};

function fromRow(row?: Row | null) {
  const d = row?.draft ?? {};
  return {
    customerName: String(d.customerName ?? row?.customer_name ?? ""),
    reviewText: String(d.reviewText ?? row?.review_text ?? ""),
    rating: Number(d.rating ?? row?.rating ?? 5),
    product: String(d.product ?? row?.product ?? ""),
    verified: Boolean(d.verified ?? row?.verified),
    isDemo: Boolean(d.isDemo ?? row?.is_demo),
  };
}

export function TestimonialForm({ testimonial }: { testimonial?: Row | null }) {
  const router = useRouter();
  const isNew = !testimonial;
  const [form, setForm] = useState(() => fromRow(testimonial));
  const [status, setStatus] = useState<PublishStatus>(
    testimonial?.status ?? "draft",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(
    action: "create" | "save" | "publish" | "unpublish" | "discard" | "delete",
  ) {
    setSaving(true);
    setError(null);
    try {
      if (action === "create") {
        const json = await adminFetch("/api/admin/testimonials", {
          method: "POST",
          body: JSON.stringify({ doc: form }),
        });
        router.replace(`/admin/testimonials/${json.id}`);
        return;
      }
      if (!testimonial?.id) return;
      if (action === "delete") {
        if (!confirm("Delete this testimonial?")) return;
        await adminFetch(`/api/admin/testimonials/${testimonial.id}`, {
          method: "DELETE",
        });
        router.replace("/admin/testimonials");
        return;
      }
      await adminFetch(`/api/admin/testimonials/${testimonial.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, doc: form }),
      });
      if (action === "publish") setStatus("published");
      if (action === "unpublish") setStatus("unpublished");
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
      <div className="flex justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          {isNew ? "New testimonial" : form.customerName || "Edit"}
        </h1>
        {!isNew && (
          <Button variant="destructive" onClick={() => run("delete")}>
            Delete
          </Button>
        )}
      </div>
      {isNew ? (
        <Button onClick={() => run("create")} disabled={saving}>
          Save draft
        </Button>
      ) : (
        <PublishBar
          status={status}
          saving={saving}
          onSave={() => run("save")}
          onPublish={() => run("publish")}
          onUnpublish={() => run("unpublish")}
          onDiscard={() => run("discard")}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label>Customer name</Label>
          <Input
            value={form.customerName}
            onChange={(e) =>
              setForm((f) => ({ ...f, customerName: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Review</Label>
          <Textarea
            value={form.reviewText}
            onChange={(e) =>
              setForm((f) => ({ ...f, reviewText: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Rating</Label>
          <Input
            type="number"
            min={1}
            max={5}
            value={form.rating}
            onChange={(e) =>
              setForm((f) => ({ ...f, rating: Number(e.target.value) }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Product</Label>
          <Input
            value={form.product}
            onChange={(e) =>
              setForm((f) => ({ ...f, product: e.target.value }))
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.verified}
            onChange={(e) =>
              setForm((f) => ({ ...f, verified: e.target.checked }))
            }
          />
          Verified
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isDemo}
            onChange={(e) =>
              setForm((f) => ({ ...f, isDemo: e.target.checked }))
            }
          />
          Demo — guests never see this testimonial
        </label>
      </div>
    </div>
  );
}
