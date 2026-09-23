import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/category-form";
import { getAdminShopType } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Edit shop type",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditShopTypePage({
  params,
}: {
  params: { id: string };
}) {
  const shopType = await getAdminShopType(params.id).catch(() => null);
  if (!shopType) notFound();
  return <CategoryForm shopType={shopType} />;
}
