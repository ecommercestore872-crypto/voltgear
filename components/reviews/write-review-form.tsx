"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, Loader2, Send, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/types";
import { uploadImage } from "@/lib/upload";
import { clearLastOrder } from "@/lib/review-reminder";

interface Props {
  products: Product[];
  categories: string[];
}

export function WriteReviewForm({ products, categories }: Props) {
  const initialSlug = useMemo(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("product") ?? "";
    }
    return "";
  }, []);

  const [category, setCategory] = useState(
    () => products.find((p) => p.slug === initialSlug)?.category ?? ""
  );
  const [slug, setSlug] = useState(initialSlug);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("product");
    if (param) {
      const product = products.find((p) => p.slug === param);
      if (product) {
        setSlug(product.slug);
        setCategory(product.category);
      }
    }
  }, [products]);

  const available = useMemo(
    () => products.filter((p) => p.category === category),
    [products, category]
  );

  const selected = useMemo(
    () => products.find((p) => p.slug === slug),
    [products, slug]
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;

    try {
      let image: string | undefined;
      if (photo) {
        const uploaded = await uploadImage(photo);
        image = uploaded.secureUrl;
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          rating,
          name: data.name,
          email: data.email,
          comment: data.comment,
          ...(image ? { image } : {}),
          category,
          productName: selected?.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");

      clearLastOrder();
      setDone(selected?.slug ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 rounded-xl border bg-card p-6 text-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">Thanks for your review!</p>
            <p className="mt-1 text-muted-foreground">
              It&rsquo;s been submitted for approval and will appear under the
              product&rsquo;s reviews shortly.
            </p>
          </div>
        </div>
        {done && (
          <Link
            href={`/product/${done}#reviews`}
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            View the product&rsquo;s reviews
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="review-category">Category *</Label>
          <select
            id="review-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace(/-/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="review-product">Product *</Label>
          <select
            id="review-product"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={!category}
            className="flex h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            <option value="" disabled>
              {category ? "Choose a product" : "Pick a category first"}
            </option>
            {available.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label>Your rating *</Label>
        <div className="mt-1.5 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              onClick={() => setRating(value)}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              className="p-1"
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  (hover || rating) >= value
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40"
                }`}
              />
            </button>
          ))}
        </div>
        {rating === 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Tap a star to rate.
          </p>
        )}
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="review-name">Name *</Label>
          <Input id="review-name" name="name" required autoComplete="name" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="review-email">Email *</Label>
          <Input
            id="review-email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="review-comment">Review *</Label>
        <Textarea
          id="review-comment"
          name="comment"
          rows={4}
          required
          placeholder="How is the product? Build quality, battery, delivery experience…"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Attach a photo (optional)</Label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          <Camera className="h-4 w-4" />
          {photo ? photo.name : "Add a photo of the product you received"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setPhoto(file);
              setPhotoUrl(file ? URL.createObjectURL(file) : null);
            }}
          />
        </label>
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Selected review photo"
            className="mt-2 max-h-40 rounded-lg border object-cover"
          />
        )}
        {photo && (
          <button
            type="button"
            onClick={() => {
              setPhoto(null);
              setPhotoUrl(null);
            }}
            className="text-xs text-muted-foreground underline"
          >
            Remove photo
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={submitting || rating === 0 || !slug}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Submit review
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        Reviews are checked before publishing. We&rsquo;ll verify your order to
        mark you as a verified buyer.
      </p>
    </form>
  );
}
