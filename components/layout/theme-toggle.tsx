"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { THEME_STORAGE_KEY } from "@/lib/theme";
import { cn } from "@/lib/utils";

function applyTheme(next: "dark" | "light") {
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // ignore storage failures
  }
  const url = new URL(window.location.href);
  if (url.searchParams.has("theme")) {
    url.searchParams.delete("theme");
    window.history.replaceState(null, "", url.toString());
  }
}

/**
 * Dark / light theme selector. Persists the visitor's choice in
 * localStorage; the Sanity "Site Settings → Theme" value is the default for
 * first-time visitors. The inline head script prevents any flash.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
    const next =
      stored === "dark" || stored === "light"
        ? stored === "dark"
        : document.documentElement.classList.contains("dark");
    setDark(next);
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    applyTheme(next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent",
        className,
      )}
    >
      <Sun className={cn("h-5 w-5", dark ? "block" : "hidden")} />
      <Moon className={cn("h-5 w-5", dark ? "hidden" : "block")} />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
