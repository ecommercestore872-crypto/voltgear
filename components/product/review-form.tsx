"use client";

import { useState } from "react";
import { Camera, Loader2, Send, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadImage } from "@/lib/upload";

export function ReviewForm({ slug }: { slug: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <p className="font-semibold text-foreground">Thanks for your review!</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          It&rsquo;s been submitted for approval and will appear here shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3.5 rounded-xl border border-border/40 bg-card px-4 py-4 shadow-sm sm:px-5"
    >
      {/* Heading */}
      <p className="text-sm font-semibold text-foreground">Write a Review</p>

      {/* Star rating */}
      <div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              onClick={() => setRating(value)}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5"
            >
              <Star
                className={`h-5 w-5 transition-colors ${
                  (hover || rating) >= value
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
          {rating === 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground">tap to rate</span>
          )}
        </div>
      </div>

      {/* Name + Email */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="review-name" className="text-xs">Name *</Label>
          <Input id="review-name" name="name" required autoComplete="name" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="review-email" className="text-xs">Email *</Label>
          <Input
            id="review-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-1">
        <Label htmlFor="review-comment" className="text-xs">Review *</Label>
        <Textarea
          id="review-comment"
          name="comment"
          rows={3}
          required
          placeholder="What did you think of this product?"
          className="resize-none text-sm"
        />
      </div>

      {/* Photo upload */}
      <div className="space-y-1.5">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          <Camera className="h-3.5 w-3.5 shrink-0" />
          {photo ? photo.name : "Attach a photo (optional)"}
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
            className="h-16 w-16 rounded-md border object-cover"
          />
        )}
        {photo && (
          <button
            type="button"
            onClick={() => { setPhoto(null); setPhotoUrl(null); }}
            className="text-xs text-muted-foreground underline"
          >
            Remove
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={submitting || rating === 0}>
          {submitting ? (
            <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Submitting…</>
          ) : (
            <><Send className="mr-1.5 h-3.5 w-3.5" />Submit</>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Reviews are checked before publishing.
        </p>
      </div>
    </form>
  );
}
