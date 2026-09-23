"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">Admin page failed to load</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Something went wrong in the browser. Try again; if it keeps happening, open
        DevTools Console and share the error with support.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
        <a href="/admin" className="rounded-md border px-4 py-2 text-sm font-medium">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}