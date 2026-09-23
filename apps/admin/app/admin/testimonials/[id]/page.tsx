import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TestimonialForm } from "@/components/admin/testimonial-form";
import { getAdminTestimonial } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Edit testimonial",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditTestimonialPage({
  params,
}: {
  params: { id: string };
}) {
  const testimonial = await getAdminTestimonial(params.id);
  if (!testimonial) notFound();
  return <TestimonialForm testimonial={testimonial as never} />;
}
