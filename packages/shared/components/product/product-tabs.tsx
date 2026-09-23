"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, MessageSquare, Star } from "lucide-react";

import { RichText } from "@/components/product/rich-text";
import { ReviewForm } from "@/components/product/review-form";
import { StarRating } from "@/components/product/star-rating";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product } from "@/lib/types";

export function ProductTabs({ product }: { product: Product }) {
  const [tab, setTab] = useState("description");

  useEffect(() => {
    if (window.location.hash === "#reviews") setTab("reviews");
  }, []);

  const reviews = useMemo(() => product.reviews ?? [], [product.reviews]);
  const reviewCount = product.reviewCount ?? reviews.length;

  const distribution = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      const rating = Math.round(r.rating ?? 0);
      if (rating >= 1 && rating <= 5) buckets[rating - 1] += 1;
    });
    return buckets.reverse();
  }, [reviews]);

  const avgFromReviews = reviews.length
    ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
    : null;

  return (
    <Tabs value={tab} onValueChange={setTab} defaultValue="description">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="description">Description</TabsTrigger>
        {product.specifications?.length ? (
          <TabsTrigger value="specifications">Specifications</TabsTrigger>
        ) : null}
        <TabsTrigger value="reviews">
          Reviews
          {reviewCount > 0 && (
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {reviewCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="description">
        <div className="space-y-6">
          {product.description?.length ? (
            <RichText blocks={product.description} />
          ) : (
            <p className="text-muted-foreground">{product.shortDescription}</p>
          )}

          {product.features?.length ? (
            <div>
              <h3 className="mb-3 text-lg font-semibold">Key Features</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {product.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </TabsContent>

      <TabsContent value="specifications">
        <div className="overflow-hidden rounded-lg border">
          {product.specifications?.map((spec, i) => (
            <div
              key={`${spec.label}-${i}`}
              className={`grid grid-cols-2 gap-2 px-4 py-3 text-sm ${
                i % 2 === 0 ? "bg-muted/40" : ""
              }`}
            >
              <span className="font-medium">{spec.label}</span>
              <span className="text-muted-foreground">{spec.value}</span>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="reviews">
        {reviews.length ? (
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Summary */}
            <div className="h-fit rounded-xl border bg-card p-6 text-center">
              <p className="text-4xl font-bold">
                {(avgFromReviews ?? product.rating ?? 0).toFixed(1)}
              </p>
              <StarRating
                rating={avgFromReviews ?? product.rating ?? 0}
                className="mt-2 justify-center"
                size={18}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Based on {reviewCount} review{reviewCount === 1 ? "" : "s"}
              </p>
              <div className="mt-4 space-y-1.5">
                {distribution.map((count, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="flex w-6 items-center gap-0.5">
                      {5 - i}
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{
                          width: `${reviews.length ? (count / reviews.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="w-4 text-right text-muted-foreground">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* List */}
            <ul className="space-y-4">
              {reviews.map((review, i) => (
                <li
                  key={`${review.name}-${i}`}
                  className="rounded-xl border bg-card p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{review.name}</span>
                      {review.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <BadgeCheck className="h-3 w-3" />
                          Verified purchase
                        </span>
                      ) : (
                        <BadgeCheck className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <StarRating rating={review.rating} size={14} />
                      {review.date && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {review.comment}
                  </p>
                  {review.image && (
                    <div className="mt-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={review.image}
                        alt={`Photo from ${review.name ?? "customer"}`}
                        className="max-h-56 rounded-lg border object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">
              No reviews yet — be the first to review this product.
            </p>
          </div>
        )}

        <ReviewForm slug={product.slug} />
      </TabsContent>
    </Tabs>
  );
}
