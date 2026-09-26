"use client";

import { useEffect } from "react";

import { shouldLoadClarity } from "@/lib/clarity-rules";

/** Loads Microsoft Clarity after idle — session replay for checkout/PDP funnels. */
export function ClarityDeferred({
  projectId,
  host,
}: {
  projectId?: string | null;
  host: string;
}) {
  useEffect(() => {
    if (
      !shouldLoadClarity({
        id: projectId,
        isAdmin: false,
        host,
      })
    ) {
      return;
    }
    const id = projectId!.trim();

    function inject() {
      if (document.querySelector(`script[data-clarity="${id}"]`)) return;
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.clarity.ms/tag/${id}`;
      s.dataset.clarity = id;
      document.head.appendChild(s);
    }

    window.addEventListener("load", () => window.setTimeout(inject, 2500), {
      once: true,
    });
  }, [projectId, host]);

  return null;
}
