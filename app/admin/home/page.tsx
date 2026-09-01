import type { Metadata } from "next";

import { HomeLayoutForm } from "@/components/admin/home-layout-form";
import { getAdminSettings } from "@/lib/db/admin-store";
import { normalizeHomeSections } from "@/lib/db/home-section-rules";

export const metadata: Metadata = {
  title: "Home layout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminHomeLayoutPage() {
  const row = await getAdminSettings();
  const sections = normalizeHomeSections(row?.home_sections);
  return <HomeLayoutForm initialSections={sections} />;
}
