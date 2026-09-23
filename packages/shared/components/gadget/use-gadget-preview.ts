"use client";

import { useEffect, useState } from "react";

import { readGadgetPreviewSession } from "@/lib/gadget-preview";

/** True when the shopper is in the gadget preview session (client-only). */
export function useGadgetPreview(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const fromQuery =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("from") === "gadget";
    setActive(fromQuery || readGadgetPreviewSession());
  }, []);

  return active;
}
