"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MediaField } from "@/components/admin/media-field";
import { PublishBar } from "@/components/admin/publish-bar";
import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublishStatus } from "@/lib/db/publish";

type HeroRow = {
  headline?: string;
  subheadline?: string;
  background_image_url?: string;
  background_images?: string[];
  background_video?: string;
  primary_cta?: { label?: string; href?: string };
  secondary_cta?: { label?: string; href?: string };
  stats?: { value?: string; label?: string }[];
  featured_product_id?: string | null;
  status?: PublishStatus;
  draft?: Record<string, unknown> | null;
};

function fromRow(row?: HeroRow | null) {
  const d = row?.draft ?? {};
  const images = Array.isArray(d.backgroundImages)
    ? (d.backgroundImages as string[])
    : Array.isArray(row?.background_images)
      ? (row?.background_images as string[])
      : d.backgroundImage || row?.background_image_url
        ? [String(d.backgroundImage || row?.background_image_url)]
        : [];

  return {
    headline: String(d.headline ?? row?.headline ?? ""),
    subheadline: String(d.subheadline ?? row?.subheadline ?? ""),
    backgroundImages: images,
    backgroundVideo: String(d.backgroundVideo ?? row?.background_video ?? ""),
    primaryLabel: String(
      (d.primaryCta as { label?: string } | undefined)?.label ??
        row?.primary_cta?.label ??
        "",
    ),
    primaryHref: String(
      (d.primaryCta as { href?: string } | undefined)?.href ??
        row?.primary_cta?.href ??
        "",
    ),
    secondaryLabel: String(
      (d.secondaryCta as { label?: string } | undefined)?.label ??
        row?.secondary_cta?.label ??
        "",
    ),
    secondaryHref: String(
      (d.secondaryCta as { href?: string } | undefined)?.href ??
        row?.secondary_cta?.href ??
        "",
    ),
    statsText: JSON.stringify(d.stats ?? row?.stats ?? [], null, 2),
    featuredProductId: String(
      d.featuredProductId ?? row?.featured_product_id ?? "",
    ),
  };
}

export function HeroForm({ hero }: { hero?: HeroRow | null }) {
  const router = useRouter();
  const [form, setForm] = useState(() => fromRow(hero));
  const [status, setStatus] = useState<PublishStatus>(
    hero?.status ?? "published",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function doc() {
    let stats: unknown[] = [];
    try {
      stats = JSON.parse(form.statsText || "[]");
    } catch {
      throw new Error("Stats must be valid JSON.");
    }
    return {
      headline: form.headline,
      subheadline: form.subheadline,
      backgroundImage: form.backgroundImages[0] || "",
      backgroundImages: form.backgroundImages,
      backgroundVideo: form.backgroundVideo,
      primaryCta: { label: form.primaryLabel, href: form.primaryHref },
      secondaryCta: { label: form.secondaryLabel, href: form.secondaryHref },
      stats,
      featuredProductId: form.featuredProductId || null,
    };
  }

  async function run(action: "save" | "publish" | "unpublish" | "discard") {
    setSaving(true);
    setError(null);
    try {
      await adminFetch("/api/admin/hero", {
        method: "PATCH",
        body: JSON.stringify({ action, doc: doc() }),
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
      <h1 className="text-2xl font-semibold">Hero</h1>
      <PublishBar
        status={status}
        saving={saving}
        onSave={() => run("save")}
        onPublish={() => run("publish")}
        onUnpublish={() => run("unpublish")}
        onDiscard={() => run("discard")}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label>Headline</Label>
          <Input
            value={form.headline}
            onChange={(e) =>
              setForm((f) => ({ ...f, headline: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Subheadline</Label>
          <Textarea
            value={form.subheadline}
            onChange={(e) =>
              setForm((f) => ({ ...f, subheadline: e.target.value }))
            }
          />
        </div>
        <MediaField
          label="Hero Slider Images"
          hint="Upload or paste image URLs for the homepage hero section. Uploading 1 image displays a static hero; uploading 2 or more displays a slider carousel in the exact order shown below. Recommended size: 1920x1080px (16:9)."
          urls={form.backgroundImages}
          onChange={(urls) =>
            setForm((f) => ({ ...f, backgroundImages: urls }))
          }
        />
        <div className="space-y-1.5">
          <Label>Background video URL</Label>
          <Input
            value={form.backgroundVideo}
            onChange={(e) =>
              setForm((f) => ({ ...f, backgroundVideo: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Primary CTA label</Label>
            <Input
              value={form.primaryLabel}
              onChange={(e) =>
                setForm((f) => ({ ...f, primaryLabel: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Primary CTA href</Label>
            <Input
              value={form.primaryHref}
              onChange={(e) =>
                setForm((f) => ({ ...f, primaryHref: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Secondary CTA label</Label>
            <Input
              value={form.secondaryLabel}
              onChange={(e) =>
                setForm((f) => ({ ...f, secondaryLabel: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Secondary CTA href</Label>
            <Input
              value={form.secondaryHref}
              onChange={(e) =>
                setForm((f) => ({ ...f, secondaryHref: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Featured product ID</Label>
          <Input
            value={form.featuredProductId}
            onChange={(e) =>
              setForm((f) => ({ ...f, featuredProductId: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Stats (JSON)</Label>
          <Textarea
            className="font-mono text-xs"
            rows={6}
            value={form.statsText}
            onChange={(e) =>
              setForm((f) => ({ ...f, statsText: e.target.value }))
            }
          />
        </div>
      </div>
    </div>
  );
}
