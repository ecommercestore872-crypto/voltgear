"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ClearCachePage() {
  const [status, setStatus] = useState("Initializing cache wipe...");
  const router = useRouter();

  useEffect(() => {
    async function wipeCache() {
      try {
        // 1. Unregister all service workers (kills the PWA memory)
        if ("serviceWorker" in navigator) {
          setStatus("Unregistering Service Workers...");
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }

        // 2. Delete all Cache Storage (kills cached static files)
        if ("caches" in window) {
          setStatus("Clearing local caches...");
          const cacheKeys = await caches.keys();
          for (const key of cacheKeys) {
            await caches.delete(key);
          }
        }

        // 3. Optional: Clear session storage to force a fresh UI state
        sessionStorage.clear();

        setStatus("Cache cleared! Redirecting...");
        
        // 4. Hard reload back to the admin page
        setTimeout(() => {
          window.location.href = "/admin";
        }, 1000);
      } catch (err) {
        console.error("Cache wipe failed", err);
        setStatus("Error clearing cache. Please reload manually.");
      }
    }

    wipeCache();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg border text-center max-w-sm w-full">
        <svg
          className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <h1 className="text-xl font-bold mb-2">Hard Reset</h1>
        <p className="text-zinc-500 text-sm">{status}</p>
      </div>
    </div>
  );
}
