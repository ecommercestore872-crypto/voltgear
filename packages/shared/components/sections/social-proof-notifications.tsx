"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ShoppingBag } from "lucide-react";

import { fetchStoreProducts } from "@/lib/store-client";
import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
];
const FIRST_NAMES = [
  "Ahmed",
  "Ali",
  "Bilal",
  "Daniyal",
  "Hassan",
  "Hunza",
  "Imran",
  "Kamran",
  "Saad",
  "Umar",
  "Zainab",
  "Ayesha",
  "Fatima",
  "Maryam",
  "Sana",
  "Hamza",
  "Usman",
  "Shahzaib",
  "Farhan",
  "Momin",
];
const TIME_LABELS = [
  "just now",
  "2 minutes ago",
  "5 minutes ago",
  "8 minutes ago",
  "12 minutes ago",
  "15 minutes ago",
  "20 minutes ago",
];

const STORAGE_KEY = "voltgear-social-proof";
const MIN_INTERVAL = 25000; // 25 seconds between notifications
const MAX_INTERVAL = 55000; // 55 seconds max
const SHOW_DURATION = 6000; // 6 seconds visible
const INITIAL_DELAY = 15000; // 15 seconds after page load

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getNotificationCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(STORAGE_KEY) || "0");
  } catch {
    return 0;
  }
}

export function SocialProofNotifications() {
  const [visible, setVisible] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [time, setTime] = useState("");

  const showNotification = useCallback((products: Product[]) => {
    if (products.length === 0) return;
    const p = rand(products);
    setProduct(p);
    setCity(rand(CITIES));
    setName(rand(FIRST_NAMES));
    setTime(rand(TIME_LABELS));
    setVisible(true);

    setTimeout(() => setVisible(false), SHOW_DURATION);

    try {
      const count = getNotificationCount() + 1;
      localStorage.setItem(STORAGE_KEY, String(count));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let products: Product[] = [];
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    fetchStoreProducts()
      .then((p) => {
        if (!cancelled)
          products = p.filter((p) => p.stockStatus !== "out-of-stock");
      })
      .catch(() => {});

    function scheduleNext() {
      if (cancelled || products.length === 0) return;
      const delay =
        MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
      const t = setTimeout(() => {
        if (!cancelled) {
          showNotification(products);
          scheduleNext();
        }
      }, delay);
      timeouts.push(t);
    }

    const initial = setTimeout(() => {
      if (!cancelled && products.length > 0) {
        showNotification(products);
        scheduleNext();
      }
    }, INITIAL_DELAY);
    timeouts.push(initial);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [showNotification]);

  if (!visible || !product) return null;

  const image = product.images?.[0];

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 z-[90] w-72 animate-in slide-in-from-left-5 fade-in duration-300 sm:bottom-6 sm:left-6",
        !visible && "hidden",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 rounded-xl border bg-background p-3 shadow-xl">
        {image ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
            <Image
              src={imageUrl(image, { w: 96 })}
              alt={product.name}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{name}</span> from{" "}
            {city} just purchased
          </p>
          <p className="mt-0.5 line-clamp-1 text-sm font-medium">
            {product.name}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{time}</p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Dismiss notification"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
