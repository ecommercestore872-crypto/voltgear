"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const isCheckout = pathname === '/checkout';

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom))] right-2 z-50 rounded-full bg-black p-2.5 sm:bottom-8 sm:right-8 sm:p-3 text-white shadow-lg transition-all duration-300 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-10 pointer-events-none",
        isCheckout && "hidden md:flex"
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6" />
    </button>
  );
}
