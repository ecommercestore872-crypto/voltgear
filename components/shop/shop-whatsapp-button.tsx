import { WhatsAppIcon } from "@/components/icons/social-icons";
import { shopWhatsAppHref } from "@/lib/contact-links";
import type { SiteSettings } from "@/lib/types";

export function ShopWhatsAppButton({ settings }: { settings: SiteSettings | null }) {
  const href = shopWhatsAppHref(settings);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:bg-[#1ebe57] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--g-forest)] sm:bottom-6 sm:right-6"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
