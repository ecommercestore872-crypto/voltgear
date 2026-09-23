import type { Metadata } from "next";

import { HomepageSectionsList } from "@/components/admin/homepage-sections-list";
import { listAdminHomepageSections } from "@/lib/db/homepage-sections-store";

export const metadata: Metadata = {
  title: "Homepage Sections",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminHomepageSectionsPage() {
  const sections = await listAdminHomepageSections();
  return <HomepageSectionsList initialSections={sections} />;
}
