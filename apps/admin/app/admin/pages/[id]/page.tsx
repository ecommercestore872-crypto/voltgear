import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageForm } from "@/components/admin/page-form";
import { getAdminPage } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Edit page",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditPagePage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const page = await getAdminPage(params.id);
  if (!page) notFound();
  return <PageForm page={page as never} />;
}
