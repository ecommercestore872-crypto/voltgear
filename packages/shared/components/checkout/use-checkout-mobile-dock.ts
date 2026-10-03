"use client";

import { useEffect, useState } from "react";

/** Hide the fixed checkout dock when the in-page order box or site footer is visible. */
export function useCheckoutMobileDock(enabled: boolean) {
  const [showDock, setShowDock] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setShowDock(false);
      return;
    }

    const footer = document.querySelector("footer");
    const orderBox = document.getElementById("checkout-order-box");
    if (!footer || !orderBox) {
      setShowDock(true);
      return;
    }

    let footerInView = false;
    let orderBoxInView = false;

    const sync = () => {
      setShowDock(!footerInView && !orderBoxInView);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === footer) footerInView = entry.isIntersecting;
          if (entry.target === orderBox) orderBoxInView = entry.isIntersecting;
        }
        sync();
      },
      { threshold: 0.08, rootMargin: "0px 0px 0px 0px" },
    );

    observer.observe(footer);
    observer.observe(orderBox);
    sync();

    const retry = window.setTimeout(() => {
      const box = document.getElementById("checkout-order-box");
      if (box && box !== orderBox) {
        observer.observe(box);
      }
      sync();
    }, 100);

    return () => {
      window.clearTimeout(retry);
      observer.disconnect();
    };
  }, [enabled]);

  return showDock;
}
