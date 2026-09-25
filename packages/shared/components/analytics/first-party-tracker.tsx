"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import {
  pageTypeFromPath,
  shouldCollectPath,
  shouldSendPageView,
  trackFirstParty,
} from "@/lib/first-party-analytics";

export function FirstPartyTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !shouldCollectPath(pathname)) return;
    if (!shouldSendPageView(pathname)) return;
    trackFirstParty({
      name: "page_view",
      path: pathname,
      page_type: pageTypeFromPath(pathname),
    });
  }, [pathname]);

  return null;
}
