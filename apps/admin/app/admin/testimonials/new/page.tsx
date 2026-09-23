import type { Metadata } from "next";

import { TestimonialForm } from "@/components/admin/testimonial-form";

export const metadata: Metadata = {
  title: "New testimonial",
  robots: { index: false, follow: false },
};

export default function NewTestimonialPage() {
  return <TestimonialForm />;
}
