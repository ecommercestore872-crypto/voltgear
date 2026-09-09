import Image from "next/image";
import Link from "next/link";

import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { ContentBlocks } from "@/components/sections/content-blocks";
import { fetchPageBySlug } from "@/lib/db/store";
import { isDemoSession } from "@/lib/demo";
import { imageUrl } from "@/lib/sanity/image";
import type { Page } from "@/lib/types";

export async function loadCmsPage(slug: string): Promise<Page | null> {
  try {
    return await fetchPageBySlug(slug, isDemoSession());
  } catch {
    return null;
  }
}

export function GadgetArticleShell({
  eyebrow,
  title,
  description,
  coverUrl,
  children,
  backHref,
  backLabel,
}: {
  eyebrow: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className={`gadget-theme ${gadgetFontClass} bg-[var(--g-cream)] text-[var(--g-charcoal)]`}>
      <div className="border-b border-[var(--g-line)] bg-[var(--g-cream-deep)]">
        <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
          <p className="gadget-eyebrow">{eyebrow}</p>
          <h1 className="gadget-h1 mt-2 text-[var(--g-charcoal)]">{title}</h1>
          {description ? (
            <p className="gadget-body mt-3 max-w-xl sm:text-base">{description}</p>
          ) : null}
        </div>
      </div>
      <article className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
        {coverUrl ? (
          <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-cream-deep)]">
            <Image
              src={coverUrl}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        ) : null}
        <div className="gadget-prose [&_a:not(.inline-flex)]:text-[var(--g-forest)] [&_a:not(.inline-flex)]:underline [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[var(--g-charcoal)] [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:text-[var(--g-taupe)] [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-[var(--g-taupe)]">
          {children}
        </div>
        {backHref ? (
          <div className="mt-12 border-t border-[var(--g-line)] pt-6">
            <Link
              href={backHref}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--g-forest)] hover:underline"
            >
              ← {backLabel || "Back"}
            </Link>
          </div>
        ) : null}
      </article>
    </div>
  );
}

export function GadgetCmsSections({ page }: { page: Page }) {
  if (page.sections?.length) {
    return <ContentBlocks blocks={page.sections} />;
  }
  return (
    <p className="rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-8 text-[var(--g-taupe)]">
      This page is maintained by the shop. If a section is missing, use{" "}
      <Link href="/contact" className="font-semibold text-[var(--g-forest)] hover:underline">
        Contact us
      </Link>
      .
    </p>
  );
}

export function cmsCover(page: Page | null): string | null {
  return page?.coverImage ? imageUrl(page.coverImage, { w: 1200 }) : null;
}
