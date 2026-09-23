"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquareQuote, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  dismissReminder,
  getLastOrder,
  isReminderDismissed,
  type LastOrder,
} from "@/lib/review-reminder";

const SHOW_DELAY_MS = 10000;

export function ReviewReminderPopup() {
  const [order, setOrder] = useState<LastOrder | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const last = getLastOrder();
      if (last && !isReminderDismissed()) {
        setOrder(last);
        setVisible(true);
      }
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible || !order) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-xl border bg-card p-4 shadow-lg">
      <button
        type="button"
        aria-label="Close reminder"
        onClick={() => {
          dismissReminder();
          setVisible(false);
        }}
        className="absolute right-3 top-3 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageSquareQuote className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">
            How&rsquo;s your {order.product.name}?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            You ordered recently — got a minute to leave a quick review? It
            helps other buyers in Pakistan make the right call.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" asChild className="flex-1">
          <Link href={`/write-review?product=${order.product.slug}`}>
            Write a review
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => {
            dismissReminder();
            setVisible(false);
          }}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
