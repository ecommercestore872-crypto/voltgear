import type { Metadata } from "next";

import { HeroForm } from "@/components/admin/hero-form";
import { HeroSlidesForm } from "@/components/admin/hero-slides-form";
import {
  getAdminHero,
  getHomePublishBlockers,
  listAdminHeroSlides,
  listAdminProductsByIds,
} from "@/lib/db/admin-store";
import { fetchActiveCategories } from "@/lib/db/store";

export const metadata: Metadata = {
  title: "Hero",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminHeroPage() {
  const hero = await getAdminHero();
  let slides: Awaited<ReturnType<typeof listAdminHeroSlides>> = [];
  let blockers: string[] = [];
  try {
    [slides, blockers] = await Promise.all([
      listAdminHeroSlides(),
      getHomePublishBlockers(),
    ]);
  } catch {
    blockers = [
      "Hero slides table is missing — run the T-16 migration (supabase db push) before managing /home2 slides.",
    ];
  }

  const slideProductIds = [
    ...new Set(
      slides
        .map((s) => String(s.product_id ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const picked = await listAdminProductsByIds(slideProductIds);
  const seedProducts = picked.map((p) => ({
    id: p._id,
    name: p.name || p.slug || p._id,
  }));

  const categories = await fetchActiveCategories();

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <HeroSlidesForm
        slides={slides as never}
        seedProducts={seedProducts}
        categories={categories}
        blockers={blockers}
      />
      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Live home hero (legacy singleton for `/`)
        </summary>
        <div className="mt-4">
          <HeroForm hero={hero as never} />
        </div>
      </details>
    </div>
  );
}
