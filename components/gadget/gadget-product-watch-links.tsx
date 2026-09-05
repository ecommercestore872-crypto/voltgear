import { InstagramIcon, TikTokIcon } from "@/components/icons/social-icons";
import { productWatchLinks } from "@/lib/product-pip-video";
import type { Product } from "@/lib/types";

export function GadgetProductWatchLinks({ product }: { product: Product }) {
  const links = productWatchLinks(product);
  if (links.length === 0) return null;

  return (
    <div className="gadget-watch-block">
      <p className="gadget-watch-heading">Short preview</p>
      <ul className="gadget-watch-links" aria-label="Watch this product">
      {links.map((link) => (
        <li key={link.platform}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`gadget-watch-link is-${link.platform}`}
            aria-label={link.platform === "instagram" ? "Watch on Instagram" : "Watch on TikTok"}
          >
            {link.platform === "instagram" ? (
              <InstagramIcon className="h-4 w-4" />
            ) : (
              <TikTokIcon className="h-4 w-4" />
            )}
          </a>
        </li>
      ))}
      </ul>
    </div>
  );
}
