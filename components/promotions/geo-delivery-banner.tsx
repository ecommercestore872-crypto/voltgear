"use client";

import { useEffect, useState } from "react";

export function GeoDeliveryBanner() {
  const [city, setCity] = useState<string | null>(null);

  useEffect(() => {
    // Safely parse the document cookie injected by Vercel Edge Middleware
    try {
      const match = document.cookie.match(/(?:^|;\s*)visitor-city=([^;]*)/);
      if (match && match[1]) {
        const decodedCity = decodeURIComponent(match[1]);
        if (decodedCity && decodedCity !== "Pakistan") {
          setCity(decodedCity);
        }
      }
    } catch {}
  }, []);

  if (city) {
    return <span className="text-[var(--g-cream)]">Cash on delivery to {city} · try it at home</span>;
  }

  return <span className="text-[var(--g-cream)]">Cash on delivery nationwide · try it at home</span>;
}
