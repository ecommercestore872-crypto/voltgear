import type { Metadata } from "next";

import { PageForm } from "@/components/admin/page-form";

export const metadata: Metadata = {
  title: "New blog guide",
  robots: { index: false, follow: false },
};

export default function NewBlogPage() {
  return <PageForm desk="blog" />;
}
