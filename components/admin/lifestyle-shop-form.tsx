"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { MediaField } from "@/components/admin/media-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EMPTY_LIFESTYLE_SHOP,
  normalizeLifestyleShop,
  type LifestyleShopConfig,
  type LifestyleShopTile,
} from "@/lib/db/lifestyle-shop-rules";

export function LifestyleShopForm({ initial }: { initial?: unknown }) {
  const router = useRouter();
  const [shop, setShop] = useState<LifestyleShopConfig>(() =>
    normalizeLifestyleShop(initial ?? EMPTY_LIFESTYLE_SHOP),
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setBanner<K extends keyof LifestyleShopConfig["banner"]>(
    key: K,
    value: LifestyleShopConfig["banner"][K],
  ) {
    setShop((current) => ({
      ...current,
      banner: { ...current.banner, [key]: value },
    }));
    setSaved(false);
  }

  function setTile(index: number, patch: Partial<LifestyleShopTile>) {
    setShop((current) => ({
      ...current,
      tiles: current.tiles.map((tile, i) =>
        i === index ? { ...tile, ...patch } : tile,
      ),
    }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const json = await adminFetch("/api/admin/lifestyle-shop", {
        method: "PUT",
        body: JSON.stringify({ shop }),
      });
      if (json?.shop) setShop(normalizeLifestyleShop(json.shop));
      setSaved(true);
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 rounded-lg border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Lifestyle shop</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Large banner on the left, four cards on the right. Change any field
          here to replace the catalog mosaic. Empty cards stay hidden. Saving
          turns the section on; use the arrows in Home layout to move it or Shop
          categories.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-muted-foreground">
          Saved. The homepage will refresh shortly.
        </p>
      ) : null}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Featured banner</h3>
        <MediaField
          label="Banner image"
          hint="Format: JPG, WEBP, or PNG. Recommended size: 1080x1350px (Portrait) or 1080x1080px (Square) to prevent distortion."
          urls={shop.banner.imageUrl ? [shop.banner.imageUrl] : []}
          onChange={(urls) => setBanner("imageUrl", urls[urls.length - 1] ?? "")}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ls-eyebrow">Small line</Label>
            <Input
              id="ls-eyebrow"
              value={shop.banner.eyebrow}
              onChange={(e) => setBanner("eyebrow", e.target.value)}
              placeholder="Curated for you"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ls-cta">Button text</Label>
            <Input
              id="ls-cta"
              value={shop.banner.cta}
              onChange={(e) => setBanner("cta", e.target.value)}
              placeholder="Shop now"
            />
          </div>
        </div>
        {(() => {
          let parsedTitle = shop.banner.title;
          let subtitle = "";
          if (parsedTitle.trim().startsWith("{")) {
            try {
              const p = JSON.parse(parsedTitle);
              parsedTitle = p.text || "";
              subtitle = p.subtitle || "";
            } catch {}
          }
          
          const updateJson = (key: string, val: string) => {
            const payload = { text: parsedTitle, subtitle, [key]: val };
            setBanner("title", JSON.stringify(payload));
          };

          return (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ls-title">Main Heading</Label>
                <Input
                  id="ls-title"
                  value={parsedTitle}
                  onChange={(e) => updateJson("text", e.target.value)}
                  placeholder="Upgrade Everyday Tech"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ls-sub">Subtitle (Optional)</Label>
                <Input
                  id="ls-sub"
                  value={subtitle}
                  onChange={(e) => updateJson("subtitle", e.target.value)}
                  placeholder="Premium accessories for work..."
                />
              </div>
            </div>
          );
        })()}
        <div className="space-y-1.5">
          <Label htmlFor="ls-href">Button link</Label>
          <Input
            id="ls-href"
            value={shop.banner.href}
            onChange={(e) => setBanner("href", e.target.value)}
            placeholder="/products2"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Four cards</h3>
        {shop.tiles.map((tile, index) => {
          let parsedTitle = tile.title;
          let eyebrow = "";
          let subtitle = "";
          let footer = "";
          if (tile.title.trim().startsWith("{")) {
            try {
              const p = JSON.parse(tile.title);
              parsedTitle = p.text || "";
              eyebrow = p.eyebrow || "";
              subtitle = p.sub || "";
              footer = p.footer || "";
            } catch {}
          }

          const updateJson = (key: string, val: string) => {
            const payload = { text: parsedTitle, eyebrow, sub: subtitle, footer, [key]: val };
            setTile(index, { title: JSON.stringify(payload) });
          };

          return (
            <div key={index} className="space-y-4 rounded-lg border p-4 bg-muted/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Card {index + 1}
              </p>
              <MediaField
                label="Card image"
                hint="Format: JPG, WEBP, or PNG. Fill-bleed layout."
                urls={tile.imageUrl ? [tile.imageUrl] : []}
                onChange={(urls) => setTile(index, { imageUrl: urls[urls.length - 1] ?? "" })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 border-t pt-2">
                  <Label>Top Eyebrow (e.g. WRIST TECH)</Label>
                  <Input value={eyebrow} onChange={(e) => updateJson("eyebrow", e.target.value)} />
                </div>
                <div className="space-y-1.5 border-t pt-2">
                  <Label>Main Title (e.g. For Everyday)</Label>
                  <Input value={parsedTitle} onChange={(e) => updateJson("text", e.target.value)} />
                </div>
                <div className="space-y-1.5 border-t pt-2">
                  <Label>Subtitle (e.g. Style that keeps up)</Label>
                  <Input value={subtitle} onChange={(e) => updateJson("sub", e.target.value)} />
                </div>
                <div className="space-y-1.5 border-t pt-2">
                  <Label>Bottom Footer Text</Label>
                  <Input value={footer} onChange={(e) => updateJson("footer", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2 border-t pt-2">
                  <Label>Target Link Destination</Label>
                  <Input
                    value={tile.href}
                    onChange={(e) => setTile(index, { href: e.target.value })}
                    placeholder="/products/smartwatch"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button type="button" disabled={busy} onClick={() => void save()}>
        {busy ? "Saving…" : "Save lifestyle shop"}
      </Button>
    </div>
  );
}
