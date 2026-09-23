import type { Metadata } from "next";

import { PageForm } from "@/components/admin/page-form";

export const metadata: Metadata = {
  title: "New page",
  robots: { index: false, follow: false },
};

export default function NewPagePage() {
  return <PageForm />;
}
