import type { Metadata } from "next";

import { CategoryForm } from "@/components/admin/category-form";

export const metadata: Metadata = {
  title: "Add shop type",
  robots: { index: false, follow: false },
};

export default function NewShopTypePage() {
  return <CategoryForm />;
}
