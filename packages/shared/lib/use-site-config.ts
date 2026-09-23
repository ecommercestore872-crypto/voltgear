"use client";

import { useEffect, useState } from "react";

import {
  normalizeSettings,
  type PublicSiteConfig,
} from "@/lib/site-config";

const EMPTY_CONFIG: PublicSiteConfig = normalizeSettings(null);

let cached: PublicSiteConfig | null = null;

/**
 * Loads public site config once per session for client components.
 * Starts from the canonical fallback so the UI never blocks on the fetch.
 */
export function useSiteConfig(): PublicSiteConfig {
  const [config, setConfig] = useState<PublicSiteConfig>(
    cached ?? EMPTY_CONFIG
  );

  useEffect(() => {
    if (cached) return;
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PublicSiteConfig | null) => {
        if (data) {
          cached = data;
          setConfig(data);
        }
      })
      .catch(() => {
        // keep canonical fallback
      });
  }, []);

  return config;
}